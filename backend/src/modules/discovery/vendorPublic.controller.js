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

// Converts a "HH:MM" / "HH:MM:SS" TIME string to minutes-from-midnight.
function timeToMinutes(t) {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + m;
}

// Given every BookingUnit row for one slot on one date, works out the true
// peak simultaneous usage (a sweep over start/end events) instead of just
// summing every booking's units_used together. Two bookings for the same
// slot at non-overlapping times (e.g. 10-12 and 2-5) must NOT stack into a
// combined "occupied" count - only bookings that overlap in time actually
// compete for the same unit at the same moment.
function computeSlotOccupancy(units, totalUnits) {
  if (units.length === 0) {
    return { occupied: 0, available: totalUnits, ranges: [] };
  }

  const events = [];
  for (const u of units) {
    events.push({ t: timeToMinutes(u.start_time), delta: u.units_used });
    events.push({ t: timeToMinutes(u.end_time), delta: -u.units_used });
  }
  // Process "end" events before "start" events at the same minute, so a
  // booking ending at 5pm doesn't falsely overlap one starting at 5pm.
  events.sort((a, b) => a.t - b.t || a.delta - b.delta);

  let running = 0;
  let peak = 0;
  for (const e of events) {
    running += e.delta;
    if (running > peak) peak = running;
  }

  const ranges = units
    .map((u) => ({ start_time: u.start_time, end_time: u.end_time, units_used: u.units_used }))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return { occupied: peak, available: Math.max(0, totalUnits - peak), ranges };
}

/**
 * GET /discovery/vendor-availability/:venueId
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD), venue_type (optional, string)
 *
 * Returns for each day in the range:
 *   - slots: array of { slot_id, slot_name, start_time, end_time, occupied,
 *     available, ranges (actual booked time windows that day), is_fully_booked }
 *   - day_status: "available" | "partial" | "booked" | "past"
 *
 * Logic:
 *   - Each vendor can have multiple slots (Morning, Evening, Full Day, etc.)
 *   - "Occupied" is the peak number of units in use at any single moment
 *     that day (computed from each booking's actual start_time/end_time),
 *     not a raw sum of every booking that day - two non-overlapping
 *     bookings must not be treated as if they compete for the same unit.
 *   - Only bookings that are still actually holding the slot count toward
 *     occupancy - a cancelled booking's booking_units rows still exist in
 *     the table (for history/audit) but must NOT block the slot for anyone
 *     else, so cancelled bookings are excluded here via the Booking join.
 *   - `ranges` lists every booked time window that day so the vendor and
 *     visitors can see exactly when a slot is busy vs. free.
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

      // For each slot: get occupied units, computed from actual overlap.
      // Keep a lookup by slot_id so the package loop below can reuse the
      // same numbers instead of re-querying and re-summing.
      const slotOccupancyById = {};
      const slotResults = await Promise.all(slots.map(async (slot) => {
        // Exclude cancelled bookings - their booking_units rows are kept
        // for history but no longer occupy the slot.
        const units = await BookingUnit.findAll({
          where: { slot_id: slot.id, date: dateStr },
          include: [{
            model: Booking,
            attributes: [],
            where: { status: { [Op.ne]: "cancelled" } },
            required: true
          }]
        });
        const { occupied, available, ranges } = computeSlotOccupancy(units, slot.total_units);
        slotOccupancyById[slot.id] = { available, ranges };
        return {
          slot_id:      slot.id,
          slot_name:    slot.name,
          service_type: slot.service_type,
          total_units:  slot.total_units,
          occupied,
          available,
          ranges,
          start_time:   slot.start_time,
          end_time:     slot.end_time,
          is_fully_booked: occupied >= slot.total_units
        };
      }));

      // For each package: check if all its slots have availability
      const packageResults = packages.map((pkg) => {
        let minAvailable = Infinity;
        for (const slotId of (pkg.slot_ids || [])) {
          const occ = slotOccupancyById[slotId];
          if (!occ) continue;
          minAvailable = Math.min(minAvailable, occ.available);
        }
        const available = minAvailable === Infinity ? 1 : minAvailable;
        return {
          package_id:   pkg.id,
          package_name: pkg.name,
          available,
          is_fully_booked: available === 0
        };
      });

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