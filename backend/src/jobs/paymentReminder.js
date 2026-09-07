const cron = require("node-cron");
const { Booking, Client } = require("../database/models");
const { Op } = require("sequelize");
const { sendWhatsApp } = require("../modules/whatsapp/whatsapp.service");

/**
 * Runs daily at 10 AM: sends WhatsApp reminders for any booking
 * with a pending balance, per the automated trigger spec.
 */
function startPaymentReminder() {
  cron.schedule("0 10 * * *", async () => {
    console.log("[JOB] Running payment reminder job...");

    const pendingBookings = await Booking.findAll({
      where: {
        balance_pending: { [Op.gt]: 0 },
        status: ["confirmed", "in_progress"]
      },
      include: [{ model: Client, as: "client" }]
    });

    for (const booking of pendingBookings) {
      await sendWhatsApp({
        venueId: booking.venue_id,
        recipientPhone: booking.client.phone,
        triggerType: "payment_reminder",
        variables: {
          customerName: booking.client.name,
          amount: booking.balance_pending
        }
      });
    }

    console.log(`[JOB] Payment reminders sent for ${pendingBookings.length} bookings.`);
  });

  console.log("[JOB] Payment reminder scheduled (daily 10 AM).");
}

module.exports = { startPaymentReminder };