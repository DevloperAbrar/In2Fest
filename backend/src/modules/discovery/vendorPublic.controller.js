// backend/src/modules/discovery/vendorPublic.controller.js

const { Op } = require("sequelize");
const { Venue, Booking, Slot } = require("../../database/models");
const { unslugify } = require("../../utils/slugify");
const { vendorSummary } = require("./search.service");
const { AppError } = require("../../middleware/error.middleware");
const { Package, BookingUnit } = require("../../database/models");

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
    const { from, to } = req.query;

    if (!from || !to) throw new AppError("from and to are required", 400);

    const venue = await Venue.findByPk(venueId, { attributes: ["id"] });
    if (!venue) throw new AppError("Venue not found", 404);

    const slots = await Slot.findAll({ where: { venue_id: venueId, is_active: true }, order: [["created_at", "ASC"]] });
    const packages = await Package.findAll({ where: { venue_id: venueId, is_active: true } });

    if (slots.length === 0 && packages.length === 0) {
      return res.json({ success: true, data: { days: [], slots: [], packages: [] } });
    }

    const today = new Date().toISOString().split("T")[0];
    const days  = [];
    let cursor  = new Date(from);
    const end   = new Date(to);

    while (cursor <= end) {
      const dateStr = cursor.toISOString().split("T")[0];

      // For each slot: get occupied units
      const slotResults = await Promise.all(slots.map(async (slot) => {
        const units = await BookingUnit.findAll({ where: { slot_id: slot.id, date: dateStr } });
        const occupied = units.reduce((s, u) => s + u.units_used, 0);
        const available = Math.max(0, slot.total_units - occupied);
        return {
          slot_id:      slot.id,
          slot_name:    slot.name,
          service_type: slot.service_type,
          total_units:  slot.total_units,
          occupied,
          available,
          start_time:   slot.start_time,
          end_time:     slot.end_time,
          is_fully_booked: occupied >= slot.total_units
        };
      }));

      // For each package: check if all its slots have availability
      const packageResults = await Promise.all(packages.map(async (pkg) => {
        let minAvailable = Infinity;
        for (const slotId of (pkg.slot_ids || [])) {
          const units = await BookingUnit.findAll({ where: { slot_id: slotId, date: dateStr } });
          const slot = slots.find(s => s.id === slotId);
          if (!slot) continue;
          const occupied = units.reduce((s, u) => s + u.units_used, 0);
          const available = Math.max(0, slot.total_units - occupied);
          minAvailable = Math.min(minAvailable, available);
        }
        const available = minAvailable === Infinity ? 1 : minAvailable;
        return {
          package_id:   pkg.id,
          package_name: pkg.name,
          available,
          is_fully_booked: available === 0
        };
      }));

      const allFullyBooked = [...slotResults, ...packageResults].every(x => x.is_fully_booked);
      const someFullyBooked = [...slotResults, ...packageResults].some(x => x.is_fully_booked);

      days.push({
        date: dateStr,
        is_past: dateStr < today,
        is_today: dateStr === today,
        day_status: dateStr < today ? "past" : allFullyBooked ? "booked" : someFullyBooked ? "partial" : "available",
        slots: slotResults,
        packages: packageResults
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({ success: true, data: { slots, packages, days } });
  } catch (error) {
    next(error);
  }
}

module.exports = { getVendorProfile, resolveThirdSegment, getVendorAvailability };