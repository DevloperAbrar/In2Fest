const bookingService = require("./booking.service");

async function convertInquiryToBooking(req, res, next) {
  try {
    const booking = await bookingService.convertInquiryToBooking(
      req.params.inquiryId,
      req.params.venueId,
      req.body
    );
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

async function createManualBooking(req, res, next) {
  try {
    const booking = await bookingService.createManualBooking(req.params.venueId, req.body);
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

async function getBookings(req, res, next) {
  try {
    const bookings = await bookingService.getBookingsByVenue(req.params.venueId, req.query);
    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
}

async function getBooking(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.params.bookingId, req.params.venueId);
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const booking = await bookingService.updateBookingStatus(
      req.params.bookingId,
      req.params.venueId,
      req.body.status
    );
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

async function updateBooking(req, res, next) {
  try {
    const booking = await bookingService.updateBooking(req.params.bookingId, req.params.venueId, req.body);
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

async function checkAvailability(req, res, next) {
  try {
    const { slotId, eventDate, venueTypes } = req.query;
    const venueTypesArray = venueTypes ? venueTypes.split(",").filter(Boolean) : [];

    const available = await bookingService.checkAvailability(req.params.venueId, slotId, eventDate, venueTypesArray);

    let nextAvailableDate = null;
    if (!available) {
      nextAvailableDate = await bookingService.getNextAvailableDate(req.params.venueId, slotId, eventDate, venueTypesArray);
    }

    res.json({ success: true, data: { available, nextAvailableDate } });
  } catch (error) {
    next(error);
  }
}

async function deleteBooking(req, res, next) {
  try {
    await bookingService.deleteBooking(req.params.bookingId, req.params.venueId);
    res.json({ success: true, message: "Booking deleted" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  convertInquiryToBooking,
  createManualBooking,
  getBookings,
  getBooking,
  updateStatus,
  updateBooking,
  checkAvailability,
  deleteBooking
};