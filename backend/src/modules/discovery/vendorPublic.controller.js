// backend/src/modules/discovery/vendorPublic.controller.js

const { Op } = require("sequelize");
const { Venue, Booking, Slot } = require("../../database/models");
const { unslugify } = require("../../utils/slugify");
const { vendorSummary } = require("./search.service");
const { AppError } = require("../../middleware/error.middleware");

async function getVendorProfile(req, res, next) {
  try {
    const { citySlug, categorySlug, vendorSlug } = req.params;
    const cityName = unslugify(citySlug);

    const venue = await Venue.findOne({
      where: {
        subdomain: vendorSlug,
        business_category: categorySlug,
        city: { [Op.iLike]: cityName },
        is_active: true,
        marketplace_listed: true
      }
    });

    if (!venue) throw new AppError("Vendor profile not found", 404);

    const similar = await Venue.findAll({
      where: {
        id: { [Op.ne]: venue.id },
        city: { [Op.iLike]: cityName },
        business_category: categorySlug,
        is_active: true,
        marketplace_listed: true
      },
      limit: 4
    });

    const description150 = (venue.long_description || "").slice(0, 155);

    res.json({
      success: true,
      data: {
        venue,
        similar_vendors: similar.map(vendorSummary),
        seo: {
          title: `${venue.hall_name} - ${categorySlug.replace(/-/g, " ")} in ${cityName} - In2Fest`,
          description: description150 || `${venue.hall_name}  - ${categorySlug.replace(/-/g, " ")} in ${cityName}. View gallery, pricing, and reviews on In2Fest.`
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

async function resolveThirdSegment(req, res, next) {
  try {
    const { citySlug, categorySlug, slug } = req.params;
    const cityName = unslugify(citySlug);

    const vendor = await Venue.findOne({
      where: {
        subdomain: slug,
        business_category: categorySlug,
        city: { [Op.iLike]: cityName },
        is_active: true,
        marketplace_listed: true
      }
    });

    if (vendor) {
      return res.json({ success: true, data: { type: "vendor" } });
    }

    res.json({ success: true, data: { type: "locality" } });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /discovery/vendor-availability/:venueId
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD), venue_type (optional, string)
 *
 * Returns for each day in the range:
 *   - slots: array of { slot_id, slot_name, start_time, end_time, venue_types_booked, is_fully_booked }
 *   - day_status: "available" | "partial" | "booked" | "past"
 *
 * Logic:
 *   - Each vendor can have multiple slots (Morning, Evening, Full Day, etc.)
 *   - Each slot can be booked for specific venue_types (Hall A, Hall B, etc.)
 *   - A slot is "booked" only if ALL venue_types of the venue are booked in that slot
 *   - If filtered by venue_type, only that type's bookings matter
 */
async function getVendorAvailability(req, res, next) {
  try {
    const { venueId } = req.params;
    const { from, to, venue_type } = req.query;

    if (!from || !to) {
      throw new AppError("from and to query params are required (YYYY-MM-DD)", 400);
    }

    const venue = await Venue.findByPk(venueId, { attributes: ["id", "venue_type"] });
    if (!venue) throw new AppError("Venue not found", 404);

    // All active slots for this venue
    const slots = await Slot.findAll({
      where: { venue_id: venueId, is_active: true },
      order: [["created_at", "ASC"]]
    });

    if (slots.length === 0) {
      return res.json({ success: true, data: { days: [], slots: [] } });
    }

    // All confirmed/in-progress bookings in the date range
    const bookings = await Booking.findAll({
      where: {
        venue_id: venueId,
        event_date: { [Op.between]: [from, to] },
        status: { [Op.in]: ["confirmed", "in_progress"] }
      },
      include: [{ model: Slot, as: "slot" }]
    });

    // Group bookings by date
    const bookingsByDate = {};
    for (const b of bookings) {
      const d = b.event_date; // DATEONLY -> "YYYY-MM-DD"
      if (!bookingsByDate[d]) bookingsByDate[d] = [];
      bookingsByDate[d].push(b);
    }

    const allVenueTypes = venue.venue_type || [];

    // Build day-by-day result
    const today = new Date().toISOString().split("T")[0];
    const days = [];

    let cursor = new Date(from);
    const end = new Date(to);

    while (cursor <= end) {
      const dateStr = cursor.toISOString().split("T")[0];
      const dayBookings = bookingsByDate[dateStr] || [];

      const slotResults = slots.map((slot) => {
        // Bookings that overlap this slot on this day
        const overlapping = dayBookings.filter((b) => {
          if (!b.slot) return false;
          // Simple time overlap check
          const reqStart = slot.start_time;
          const reqEnd = slot.end_time;
          const bStart = b.slot.start_time;
          const bEnd = b.slot.end_time;
          if (!reqStart || !reqEnd || !bStart || !bEnd) {
            // full_day / package type - match by slot_id
            return b.slot_id === slot.id;
          }
          // Overlap: not (reqEnd <= bStart || bEnd <= reqStart)
          return !(reqEnd <= bStart || bEnd <= reqStart);
        });

        const venueTypesBooked = [...new Set(overlapping.flatMap((b) => b.venue_type || []))];

        let isFullyBooked;
        if (venue_type) {
          // Filtered view: is this specific hall booked?
          isFullyBooked = venueTypesBooked.includes(venue_type);
        } else if (allVenueTypes.length > 0) {
          // All halls view: fully booked only if every hall is booked
          isFullyBooked = allVenueTypes.every((vt) => venueTypesBooked.includes(vt));
        } else {
          // No venue types defined: any booking blocks the slot
          isFullyBooked = overlapping.length > 0;
        }

        return {
          slot_id: slot.id,
          slot_name: slot.name,
          pricing_type: slot.pricing_type,
          start_time: slot.start_time,
          end_time: slot.end_time,
          venue_types_booked: venueTypesBooked,
          is_booked: isFullyBooked
        };
      });

      const allBooked = slotResults.every((s) => s.is_booked);
      const someBooked = slotResults.some((s) => s.is_booked);

      days.push({
        date: dateStr,
        is_past: dateStr < today,
        is_today: dateStr === today,
        day_status: dateStr < today
          ? "past"
          : allBooked
            ? "booked"
            : someBooked
              ? "partial"
              : "available",
        slots: slotResults
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        venue_types: allVenueTypes,
        slots: slots.map((s) => ({
          id: s.id,
          name: s.name,
          pricing_type: s.pricing_type,
          start_time: s.start_time,
          end_time: s.end_time
        })),
        days
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getVendorProfile, resolveThirdSegment, getVendorAvailability };