const cron = require("node-cron");
const dayjs = require("dayjs");
const { Subscription, Venue, Plan } = require("../database/models");
const subscriptionService = require("../modules/subscriptions/subscription.service");
const { sendWhatsApp } = require("../modules/whatsapp/whatsapp.service");

/**
 * Runs daily at 9 AM: recalculates subscription statuses and sends
 * automated trial/expiry reminders per the spec's trigger rules.
 */
function startTrialExpiryChecker() {
  cron.schedule("0 9 * * *", async () => {
    console.log("[JOB] Running trial/expiry checker...");

    await subscriptionService.recalculateAllStatuses();

    // 3 days before trial expiry -> reminder
    const threeDaysFromNow = dayjs().add(3, "day").format("YYYY-MM-DD");
    const expiringTrials = await Subscription.findAll({
      where: { status: "trial" },
      include: [{ model: Venue, attributes: ["id", "hall_name", "phone"] }]
    });

    for (const sub of expiringTrials) {
      const trialEndDate = dayjs(sub.trial_ends_at).format("YYYY-MM-DD");
      if (trialEndDate === threeDaysFromNow) {
        await sendWhatsApp({
          venueId: sub.venue_id,
          recipientPhone: sub.Venue.phone,
          triggerType: "trial_expiry",
          variables: { daysLeft: "3" }
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