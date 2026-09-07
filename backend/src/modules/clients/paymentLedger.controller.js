const { PaymentLedger, Booking, Client } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

async function addLedgerEntry(req, res, next) {
  try {
    const booking = await Booking.findOne({ where: { id: req.params.bookingId, venue_id: req.params.venueId } });
    if (!booking) throw new AppError("Booking not found", 404);

    const entry = await PaymentLedger.create({
      booking_id: booking.id,
      amount: req.body.amount,
      type: req.body.type || "advance",
      method: req.body.method,
      reference_number: req.body.reference_number,
      paid_at: req.body.paid_at || new Date(),
      recorded_by: req.user.id
    });

    // Recalculate booking + client balances
    booking.amount_received = Number(booking.amount_received) + Number(entry.amount);
    booking.balance_pending = Number(booking.total_amount) - Number(booking.amount_received);
    await booking.save();

    const client = await Client.findByPk(booking.client_id);
    client.pending_balance = Math.max(0, Number(client.pending_balance) - Number(entry.amount));
    await client.save();

    res.status(201).json({ success: true, data: { entry, booking } });
  } catch (error) {
    next(error);
  }
}

async function getLedgerForBooking(req, res, next) {
  try {
    const entries = await PaymentLedger.findAll({
      where: { booking_id: req.params.bookingId },
      order: [["paid_at", "ASC"]]
    });
    res.json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
}

module.exports = { addLedgerEntry, getLedgerForBooking };