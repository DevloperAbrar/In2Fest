const cron = require("node-cron");
const dayjs = require("dayjs");
const { Subscription, Venue } = require("../database/models");
const subscriptionService = require("../modules/subscriptions/subscription.service");
const { sendWhatsApp } = require("../modules/whatsapp/whatsapp.service");

// With a 5-day trial: reminder on day 2 (3 days left) and day 4 (1 day left).
const TRIAL_REMINDER_DAYS = [3, 1];

/**
 * Runs daily at 9 AM: recalculates subscription statuses and sends
 * automated trial/expiry reminders.
 */
function startTrialExpiryChecker() {
  cron.schedule("0 9 * * *", async () => {
    console.log("[JOB] Running trial/expiry checker...");

    await subscriptionService.recalculateAllStatuses();

    const trials = await Subscription.findAll({
      where: { status: "trial" },
      include: [{ model: Venue, attributes: ["id", "hall_name", "phone"] }]
    });

    const today = dayjs().startOf("day");
    for (const sub of trials) {
      const endsAt = sub.trial_ends_at || sub.current_period_end;
      if (!endsAt || !sub.Venue) continue;

      const daysLeft = dayjs(endsAt).startOf("day").diff(today, "day");
      if (TRIAL_REMINDER_DAYS.includes(daysLeft)) {
        await sendWhatsApp({
          venueId: sub.venue_id,
          recipientPhone: sub.Venue.phone,
          triggerType: "trial_expiry",
          variables: { daysLeft: String(daysLeft) }
        });
      }
    }

    // 1 day after expiry -> reminder again
    const oneDayAgo = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const expiredSubs = await Subscription.findAll({
      where: { status: "expired" },
      include: [{ model: Venue, attributes: ["id", "hall_name", "phone"] }]
    });

    for (const sub of expiredSubs) {
      if (!sub.Venue) continue;
      const expiredDate = dayjs(sub.current_period_end).format("YYYY-MM-DD");
      if (expiredDate === oneDayAgo) {
        await sendWhatsApp({
          venueId: sub.venue_id,
          recipientPhone: sub.Venue.phone,
          triggerType: "subscription_expired",
          variables: {}
        });
      }
    }

    console.log("[JOB] Trial/expiry checker completed.");
  });

  console.log("[JOB] Trial expiry checker scheduled (daily 9 AM).");
}

module.exports = { startTrialExpiryChecker };