const cron = require("node-cron");
const dayjs = require("dayjs");
const crypto = require("crypto");
const { Booking, Client, Venue, ReviewRequest } = require("../database/models");
const { sendWhatsApp } = require("../modules/whatsapp/whatsapp.service");
const env = require("../config/env");

/**
 * Runs daily at 11 AM: finds bookings completed 2 days ago with no review
 * request sent yet, and sends each customer a unique review link.
 */
function startReviewRequestSender() {
  cron.schedule("0 11 * * *", async () => {
    console.log("[JOB] Running post-event review request job...");

    const twoDaysAgo = dayjs().subtract(2, "day").format("YYYY-MM-DD");

    const completedBookings = await Booking.findAll({
      where: { status: "completed", event_date: twoDaysAgo },
      include: [{ model: Client, as: "client" }, { model: Venue }]
    });

    let sentCount = 0;

    for (const booking of completedBookings) {
      const alreadySent = await ReviewRequest.findOne({ where: { booking_id: booking.id } });
      if (alreadySent) continue;

      const token = crypto.randomBytes(16).toString("hex");
      const reviewLink = `https://${env.baseDomain}/review/${token}`;

      const message = await sendWhatsApp({
        venueId: booking.venue_id,
        recipientPhone: booking.client.phone,
        triggerType: "review_request",
        variables: {
          customerName: booking.client.name,
          venueName: booking.Venue?.hall_name || "",
          reviewLink
        }
      });

      await ReviewRequest.create({
        venue_id: booking.venue_id,
        booking_id: booking.id,
        customer_phone: booking.client.phone,
        whatsapp_message_id: message?.id ? String(message.id) : null,
        review_token: token,
        sent_at: new Date(),
        review_submitted: false
      });

      sentCount++;
    }

    console.log(`[JOB] Review requests sent for ${sentCount} bookings.`);
  });

  console.log("[JOB] Review request sender scheduled (daily 11 AM).");
}

module.exports = { startReviewRequestSender };