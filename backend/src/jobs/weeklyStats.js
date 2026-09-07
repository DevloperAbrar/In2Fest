const cron = require("node-cron");
const dayjs = require("dayjs");
const { Op } = require("sequelize");
const { Venue, Inquiry, Review } = require("../database/models");
const { sendWhatsApp } = require("../modules/whatsapp/whatsapp.service");

/**
 * Runs every Monday at 9 AM  - sends each active venue their weekly marketplace stats.
 */
function startWeeklyStats() {
  cron.schedule("0 9 * * 1", async () => {
    console.log("[JOB] Running weekly marketplace stats job...");

    const weekAgo = dayjs().subtract(7, "day").toDate();
    const venues = await Venue.findAll({ where: { is_active: true, marketplace_listed: true } });

    for (const venue of venues) {
      const inquiries = await Inquiry.count({
        where: { venue_id: venue.id, source: "marketplace", created_at: { [Op.gte]: weekAgo } }
      });
      const reviews = await Review.count({
        where: { venue_id: venue.id, status: "approved", created_at: { [Op.gte]: weekAgo } }
      });

      await sendWhatsApp({
        venueId: venue.id,
        recipientPhone: venue.whatsapp_number || venue.phone,
        triggerType: "weekly_stats_vendor",
        variables: { views: "N/A", inquiries, reviews } // profile view tracking is a future enhancement
      });
    }

    console.log(`[JOB] Weekly stats sent to ${venues.length} venues.`);
  });

  console.log("[JOB] Weekly stats job scheduled (Mondays, 9 AM).");
}

module.exports = { startWeeklyStats };