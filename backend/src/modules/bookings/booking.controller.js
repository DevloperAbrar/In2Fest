const bookingService = require("./booking.service");

async function createManualBooking(req, res, next) {
  try {
    const booking = await bookingService.createManualBooking(req.params.venueId, req.body);
    res.status(201).json({ success: true, data: booking });
  } catch (e) { next(e); }
}

async function getBookings(req, res, next) {
  try {
    const bookings = await bookingService.getBookingsByVenue(req.params.venueId, req.query);
    res.json({ success: true, data: bookings });
  } catch (e) { next(e); }
}

async function getBooking(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.params.bookingId, req.params.venueId);
    res.json({ success: true, data: booking });
  } catch (e) { next(e); }
}

async function updateStatus(req, res, next) {
  try {
    const booking = await bookingService.updateBookingStatus(req.params.bookingId, req.params.venueId, req.body.status);
    res.json({ success: true, data: booking });
  } catch (e) { next(e); }
}

async function updateBooking(req, res, next) {
  try {
    const booking = await bookingService.updateBooking(req.params.bookingId, req.params.venueId, req.body);
    res.json({ success: true, data: booking });
  } catch (e) { next(e); }
}

async function deleteBooking(req, res, next) {
  try {
    await bookingService.deleteBooking(req.params.bookingId, req.params.venueId);
    res.json({ success: true, message: "Booking deleted" });
  } catch (e) { next(e); }
}

async function checkAvailability(req, res, next) {
  try {
    const { date, start_time, end_time } = req.query;
    const data = await bookingService.getSlotAvailability(req.params.venueId, date, start_time, end_time);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

module.exports = { createManualBooking, getBookings, getBooking, updateStatus, updateBooking, deleteBooking, checkAvailability };