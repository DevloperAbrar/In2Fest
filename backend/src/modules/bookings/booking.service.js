const { Op } = require("sequelize");
const { Booking, Client, Slot, Package, BookingUnit, sequelize } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

// Get all dates between date_from and date_to
function getDateRange(from, to) {
  const dates = [];
  let cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// Check how many units are occupied for a slot on a date+time.
// Cancelled bookings are excluded - their booking_units rows stay in the
// table for history, but a cancelled booking must not block the slot.
async function getOccupiedUnits(venueId, slotId, date, startTime, endTime) {
  const units = await BookingUnit.findAll({
    where: {
      venue_id: venueId,
      slot_id: slotId,
      date,
      start_time: { [Op.lt]: endTime },
      end_time:   { [Op.gt]: startTime }
    },
    include: [{
      model: Booking,
      attributes: [],
      where: { status: { [Op.ne]: "cancelled" } },
      required: true
    }]
  });
  return units.reduce((sum, u) => sum + u.units_used, 0);
}

// A package stores its slot ids as plain JSON (no foreign key), so ids of
// slots that were later deleted can linger inside it. Only ever use slots
// that still exist for this venue - inserting a stale id into booking_units
// violates booking_units_slot_id_fkey.
async function getPackageSlots(pkg, venueId, t) {
  const wanted = new Set((pkg?.slot_ids || []).filter(Boolean));
  if (wanted.size === 0) return [];
  const venueSlots = await Slot.findAll({ where: { venue_id: venueId }, transaction: t });
  return venueSlots.filter((s) => wanted.has(s.id));
}

async function createManualBooking(venueId, data) {
  const {
    client_name, phone, email,
    date_from, date_to,
    start_time, end_time,
    booking_items = [],   // [{ type: "slot"|"package", id, name, amount }]
    notes, total_amount
  } = data;

  return sequelize.transaction(async (t) => {
    // 1. Upsert client
    let client = await Client.findOne({ where: { venue_id: venueId, phone }, transaction: t });
    if (!client) {
      client = await Client.create({ venue_id: venueId, name: client_name, phone, email }, { transaction: t });
    } else {
      await client.update({ name: client_name, email }, { transaction: t });
    }

    const dateFrom = date_from;
    const dateTo   = date_to || date_from;
    const dates    = getDateRange(dateFrom, dateTo);

    // 2. Validate unit availability for each slot item across all dates
    for (const item of booking_items) {
      if (item.type !== "slot") continue;
      const slot = await Slot.findOne({ where: { id: item.id, venue_id: venueId }, transaction: t });
      if (!slot) throw new Error(`Slot not found: ${item.id}`);

      for (const date of dates) {
        const occupied = await getOccupiedUnits(venueId, slot.id, date, start_time, end_time);
        if (occupied >= slot.total_units) {
          throw new Error(`Slot "${slot.name}" is fully booked on ${date} for ${start_time}–${end_time}`);
        }
      }
    }

    // 3. For package items - resolve the slots that REALLY exist, then check
    //    each of them across all dates. The resolved list is reused in step 5
    //    so we never insert a booking_unit for a deleted/stale slot id.
    const packageSlotsById = {};
    for (const item of booking_items) {
      if (item.type !== "package") continue;
      const pkg = await Package.findOne({ where: { id: item.id, venue_id: venueId }, transaction: t });
      if (!pkg) throw new Error(`Package not found: ${item.id}`);

      const pkgSlots = await getPackageSlots(pkg, venueId, t);
      if (pkgSlots.length === 0) {
        throw new AppError(
          `Package "${pkg.name}" has no valid slots linked to it. Please edit the package and select its slots again.`,
          400
        );
      }
      packageSlotsById[pkg.id] = pkgSlots;

      for (const slot of pkgSlots) {
        for (const date of dates) {
          const occupied = await getOccupiedUnits(venueId, slot.id, date, start_time, end_time);
          if (occupied >= slot.total_units) {
            throw new Error(`Slot "${slot.name}" (in package "${pkg.name}") is fully booked on ${date}`);
          }
        }
      }
    }

    // 4. Create booking
    const booking = await Booking.create({
      venue_id: venueId,
      client_id: client.id,
      date_from: dateFrom,
      date_to: dateTo,
      event_date: dateFrom,   // backward compat
      start_time,
      end_time,
      booking_items,
      total_amount: total_amount || 0,
      notes,
      status: "confirmed"
    }, { transaction: t });

    // 5. Create booking_units for each slot item
    const unitRows = [];

    for (const item of booking_items) {
      if (item.type === "slot") {
        for (const date of dates) {
          unitRows.push({ booking_id: booking.id, venue_id: venueId, slot_id: item.id, date, start_time, end_time, units_used: 1 });
        }
      }
      if (item.type === "package") {
        for (const slot of (packageSlotsById[item.id] || [])) {
          for (const date of dates) {
            unitRows.push({ booking_id: booking.id, venue_id: venueId, slot_id: slot.id, date, start_time, end_time, units_used: 1 });
          }
        }
      }
    }

    if (unitRows.length > 0) {
      await BookingUnit.bulkCreate(unitRows, { transaction: t });
    }

    return booking;
  });
}

async function getBookingsByVenue(venueId, query = {}) {
  const where = { venue_id: venueId };
  if (query.status) where.status = query.status;
  return Booking.findAll({
    where,
    include: [
      { model: Client, as: "client" },
      { model: Slot,   as: "slot", required: false },
      { model: Package, as: "package", required: false }
    ],
    order: [["date_from", "DESC"], ["created_at", "DESC"]]
  });
}

async function getBookingById(bookingId, venueId) {
  return Booking.findOne({
    where: { id: bookingId, venue_id: venueId },
    include: [
      { model: Client,  as: "client" },
      { model: Slot,    as: "slot",    required: false },
      { model: Package, as: "package", required: false }
    ]
  });
}

async function updateBookingStatus(bookingId, venueId, status) {
  const booking = await Booking.findOne({ where: { id: bookingId, venue_id: venueId } });
  if (!booking) throw new Error("Booking not found");
  return booking.update({ status });
}

// Numeric columns on the Booking model - an empty string ("") from a
// cleared number input must become NULL, not be sent to Postgres as-is
// (an INTEGER/DECIMAL column rejects "" with "invalid input syntax").
const NUMERIC_BOOKING_FIELDS = ["guest_count", "total_amount", "amount_received", "balance_pending"];

function sanitizeBookingUpdate(data) {
  const clean = { ...data };
  for (const field of NUMERIC_BOOKING_FIELDS) {
    if (clean[field] === "") clean[field] = null;
  }
  return clean;
}

// Rebuilds booking_units for a booking from its CURRENT booking_items and
// the given date/time - used whenever the schedule changes so the units
// that drive availability calculations never go stale/out of sync with
// what the booking actually shows on the calendar.
async function regenerateBookingUnits(booking, venueId, t) {
  const dateFrom = booking.date_from;
  const dateTo   = booking.date_to || booking.date_from;
  const dates    = getDateRange(dateFrom, dateTo);

  await BookingUnit.destroy({ where: { booking_id: booking.id }, transaction: t });

  const unitRows = [];
  for (const item of (booking.booking_items || [])) {
    if (item.type === "slot") {
      for (const date of dates) {
        unitRows.push({ booking_id: booking.id, venue_id: venueId, slot_id: item.id, date, start_time: booking.start_time, end_time: booking.end_time, units_used: 1 });
      }
    }
    if (item.type === "package") {
      const pkg = await Package.findByPk(item.id, { transaction: t });
      // Only slots that still exist - stale ids inside the package are skipped
      const pkgSlots = await getPackageSlots(pkg, venueId, t);
      for (const slot of pkgSlots) {
        for (const date of dates) {
          unitRows.push({ booking_id: booking.id, venue_id: venueId, slot_id: slot.id, date, start_time: booking.start_time, end_time: booking.end_time, units_used: 1 });
        }
      }
    }
  }

  if (unitRows.length > 0) {
    await BookingUnit.bulkCreate(unitRows, { transaction: t });
  }
}

async function updateBooking(bookingId, venueId, data) {
  const booking = await Booking.findOne({ where: { id: bookingId, venue_id: venueId } });
  if (!booking) throw new Error("Booking not found");

  // client_* fields describe the linked Client record, not the booking itself.
  // Booking.update() silently ignores them, so they must be saved on the Client.
  const { client_name, client_phone, client_email, ...bookingData } = data || {};
  const clean = sanitizeBookingUpdate(bookingData);

  const clientChanges = {};
  if (typeof client_name === "string" && client_name.trim()) clientChanges.name = client_name.trim();
  if (typeof client_phone === "string" && client_phone.trim()) clientChanges.phone = client_phone.trim();
  if (typeof client_email === "string") clientChanges.email = client_email.trim() || null;

  // If date/time is changing, the booking_units rows created back when the
  // booking was first made now describe the OLD schedule - they must be
  // rebuilt to match, otherwise they keep occupying the old slot forever
  // (invisible on the calendar, silently eating into capacity elsewhere).
  const SCHEDULE_FIELDS = ["date_from", "date_to", "start_time", "end_time"];
  const touchesSchedule = SCHEDULE_FIELDS.some((f) => f in clean);

  return sequelize.transaction(async (t) => {
    if (Object.keys(clientChanges).length > 0) {
      await Client.update(clientChanges, {
        where: { id: booking.client_id, venue_id: venueId },
        transaction: t
      });
    }

    await booking.update(clean, { transaction: t });

    if (touchesSchedule) {
      await regenerateBookingUnits(booking, venueId, t);
    }
    return booking;
  });
}

async function deleteBooking(bookingId, venueId) {
  const booking = await Booking.findOne({ where: { id: bookingId, venue_id: venueId } });
  if (!booking) throw new Error("Booking not found");
  await BookingUnit.destroy({ where: { booking_id: bookingId } });
  return booking.destroy();
}

// For public availability calendar.
// Cancelled bookings are excluded here too - see getOccupiedUnits above.
async function getSlotAvailability(venueId, date, startTime, endTime) {
  const slots = await Slot.findAll({ where: { venue_id: venueId, is_active: true } });
  const result = [];
  for (const slot of slots) {
    const st = startTime || slot.start_time;
    const et = endTime   || slot.end_time;
    if (!st || !et) {
      result.push({ slot_id: slot.id, slot_name: slot.name, service_type: slot.service_type, total_units: slot.total_units, occupied: 0, available: slot.total_units });
      continue;
    }
    const occupied = await getOccupiedUnits(venueId, slot.id, date, st, et);
    result.push({
      slot_id: slot.id,
      slot_name: slot.name,
      service_type: slot.service_type,
      total_units: slot.total_units,
      occupied,
      available: Math.max(0, slot.total_units - occupied),
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_fully_booked: occupied >= slot.total_units
    });
  }
  return result;
}

module.exports = {
  createManualBooking,
  getBookingsByVenue,
  getBookingById,
  updateBookingStatus,
  updateBooking,
  deleteBooking,
  getSlotAvailability,
  getOccupiedUnits,
};