const { Booking, Client, Inquiry, Slot } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { sendWhatsApp } = require("../whatsapp/whatsapp.service");
const dayjs = require("dayjs");

async function convertInquiryToBooking(inquiryId, venueId, payload) {
  const inquiry = await Inquiry.findOne({ where: { id: inquiryId, venue_id: venueId } });
  if (!inquiry) throw new AppError("Inquiry not found", 404);

  const slotId = payload.slot_id || inquiry.slot_id;
  const venueTypes = Array.isArray(payload.venue_type)
    ? payload.venue_type
    : (payload.venue_type ? [payload.venue_type] : []);

  const isFree = await checkAvailability(venueId, slotId, inquiry.event_date, venueTypes);
  if (!isFree) {
    throw new AppError("This slot is already booked for the selected venue type on this date", 409);
  }

  let client = await Client.findOne({ where: { venue_id: venueId, phone: inquiry.phone } });
  if (!client) {
    client = await Client.create({
      venue_id: venueId,
      name: inquiry.customer_name,
      phone: inquiry.phone,
      email: inquiry.email,
      source: "inquiry"
    });
  }

  const booking = await Booking.create({
    venue_id: venueId,
    client_id: client.id,
    slot_id: slotId,
    inquiry_id: inquiry.id,
    event_date: inquiry.event_date,
    venue_type: venueTypes,
    event_type: inquiry.event_type,
    guest_count: inquiry.guest_count,
    total_amount: payload.total_amount || 0,
    balance_pending: payload.total_amount || 0,
    status: "confirmed"
  });

  inquiry.status = "confirmed";
  await inquiry.save();

  client.total_business_value = Number(client.total_business_value) + Number(booking.total_amount);
  client.pending_balance = Number(client.pending_balance) + Number(booking.balance_pending);
  await client.save();

  return booking;
}

async function createManualBooking(venueId, payload) {
  let client;

  if (payload.client_id) {
    client = await Client.findOne({ where: { id: payload.client_id, venue_id: venueId } });
    if (!client) throw new AppError("Client not found", 404);
  } else {
    client = await Client.create({
      venue_id: venueId,
      name: payload.client_name,
      phone: payload.client_phone,
      email: payload.client_email,
      source: "booking"
    });
  }

  const venueTypes = Array.isArray(payload.venue_type) ? payload.venue_type : (payload.venue_type ? [payload.venue_type] : []);

  const isFree = await checkAvailability(venueId, payload.slot_id, payload.event_date, venueTypes);
  if (!isFree) {
    throw new AppError("This slot is already booked for the selected venue type on this date", 409);
  }

  const booking = await Booking.create({
    venue_id: venueId,
    client_id: client.id,
    slot_id: payload.slot_id,
    event_date: payload.event_date,
    venue_type: venueTypes,
    event_type: payload.event_type,
    guest_count: payload.guest_count,
    total_amount: payload.total_amount || 0,
    balance_pending: payload.total_amount || 0,
    notes: payload.notes
  });

  client.total_business_value = Number(client.total_business_value) + Number(booking.total_amount);
  client.pending_balance = Number(client.pending_balance) + Number(booking.balance_pending);
  await client.save();

  sendWhatsApp({
    venueId,
    recipientPhone: client.phone,
    triggerType: "booking_confirmed",
    variables: { customerName: client.name, eventDate: payload.event_date }
  }).catch((err) => console.error("[WHATSAPP] Failed to notify customer of booking:", err.message));

  return booking;
}

async function getBookingsByVenue(venueId, filters = {}) {
  const where = { venue_id: venueId };
  if (filters.status) where.status = filters.status;
  if (filters.slot_id) where.slot_id = filters.slot_id;
  if (filters.date_from && filters.date_to) {
    const { Op } = require("sequelize");
    where.event_date = { [Op.between]: [filters.date_from, filters.date_to] };
  }

  return Booking.findAll({
    where,
    include: [
      { model: Client, as: "client" },
      { model: Slot, as: "slot" }
    ],
    order: [["event_date", "ASC"]]
  });
}

async function getBookingById(bookingId, venueId) {
  const booking = await Booking.findOne({
    where: { id: bookingId, venue_id: venueId },
    include: [{ model: Client, as: "client" }, { model: Slot, as: "slot" }]
  });
  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
}

async function updateBookingStatus(bookingId, venueId, status) {
  const booking = await getBookingById(bookingId, venueId);
  booking.status = status;
  await booking.save();
  return booking;
}

async function updateBooking(bookingId, venueId, updates) {
  const booking = await getBookingById(bookingId, venueId);

  const newSlotId = updates.slot_id !== undefined ? updates.slot_id : booking.slot_id;
  const newDate = updates.event_date !== undefined ? updates.event_date : booking.event_date;
  const newVenueTypes = updates.venue_type !== undefined
    ? (Array.isArray(updates.venue_type) ? updates.venue_type : [updates.venue_type])
    : (booking.venue_type || []);

  const slotChanged = newSlotId !== booking.slot_id;
  const dateChanged = String(newDate) !== String(booking.event_date);
  const venueTypeChanged = JSON.stringify(newVenueTypes) !== JSON.stringify(booking.venue_type || []);

  if (slotChanged || dateChanged || venueTypeChanged) {
    const isFree = await checkAvailability(venueId, newSlotId, newDate, newVenueTypes, bookingId);
    if (!isFree) {
      throw new AppError("This slot is already booked for the selected venue type on this date", 409);
    }
  }

  if (updates.slot_id !== undefined) booking.slot_id = updates.slot_id;
  if (updates.event_date !== undefined) booking.event_date = updates.event_date;
  if (updates.venue_type !== undefined) booking.venue_type = newVenueTypes;
  if (updates.event_type !== undefined) booking.event_type = updates.event_type;
  if (updates.guest_count !== undefined) booking.guest_count = updates.guest_count;
  if (updates.notes !== undefined) booking.notes = updates.notes;
  if (updates.status !== undefined) booking.status = updates.status;

  await booking.save();

  if (updates.client_name !== undefined || updates.client_phone !== undefined) {
    const client = await Client.findByPk(booking.client_id);
    if (client) {
      if (updates.client_name !== undefined) client.name = updates.client_name;
      if (updates.client_phone !== undefined) client.phone = updates.client_phone;
      await client.save();
    }
  }

  return getBookingById(bookingId, venueId);
}

function toMinutes(timeStr) {
  const [h, m, s] = timeStr.split(":").map(Number);
  return h * 60 + m + (s || 0) / 60;
}

function splitIntoSegments(startStr, endStr) {
  const start = toMinutes(startStr);
  const end = toMinutes(endStr);
  if (end > start) return [[start, end]];
  return [[start, 1440], [0, end]];
}

function timeRangesOverlap(startA, endA, startB, endB) {
  const segmentsA = splitIntoSegments(startA, endA);
  const segmentsB = splitIntoSegments(startB, endB);

  for (const [aStart, aEnd] of segmentsA) {
    for (const [bStart, bEnd] of segmentsB) {
      if (aStart < bEnd && bStart < aEnd) return true;
    }
  }
  return false;
}

async function checkAvailability(venueId, slotId, eventDate, venueTypes = [], excludeBookingId = null) {
  const { Op } = require("sequelize");

  const requestedSlot = await Slot.findOne({ where: { id: slotId, venue_id: venueId } });
  if (!requestedSlot) throw new AppError("Slot not found", 404);

  const where = {
    venue_id: venueId,
    event_date: eventDate,
    status: ["confirmed", "in_progress"]
  };
  if (excludeBookingId) where.id = { [Op.ne]: excludeBookingId };

  const existingBookings = await Booking.findAll({
    where,
    include: [{ model: Slot, as: "slot" }]
  });

  if (existingBookings.length === 0) return true;

  for (const booking of existingBookings) {
    const bookedTypes = booking.venue_type || [];

    if (venueTypes && venueTypes.length > 0 && bookedTypes.length > 0) {
      const venueTypeOverlap = bookedTypes.some((t) => venueTypes.includes(t));
      if (!venueTypeOverlap) continue;
    }

    const existingSlot = booking.slot;
    if (!existingSlot) continue;

    const overlaps = timeRangesOverlap(
      requestedSlot.start_time, requestedSlot.end_time,
      existingSlot.start_time, existingSlot.end_time
    );

    if (overlaps) return false;
  }

  return true;
}

async function getNextAvailableDate(venueId, slotId, fromDate, venueTypes = [], maxDays = 60) {
  let date = dayjs(fromDate);

  for (let i = 1; i <= maxDays; i++) {
    date = date.add(1, "day");
    const dateStr = date.format("YYYY-MM-DD");
    const isFree = await checkAvailability(venueId, slotId, dateStr, venueTypes);
    if (isFree) return dateStr;
  }

  return null;
}

async function deleteBooking(bookingId, venueId) {
  const { PaymentLedger } = require("../../database/models");

  const booking = await getBookingById(bookingId, venueId);

  const client = await Client.findByPk(booking.client_id);
  if (client) {
    client.total_business_value = Math.max(0, Number(client.total_business_value) - Number(booking.total_amount));
    client.pending_balance = Math.max(0, Number(client.pending_balance) - Number(booking.balance_pending));
    await client.save();
  }

  await PaymentLedger.destroy({ where: { booking_id: booking.id } });
  await booking.destroy();

  return { id: bookingId };
}

module.exports = {
  convertInquiryToBooking,
  createManualBooking,
  getBookingsByVenue,
  getBookingById,
  updateBookingStatus,
  updateBooking,
  checkAvailability,
  getNextAvailableDate,
  deleteBooking
};