const { Venue, Subscription, Plan } = require("../database/models");
const { AppError } = require("../middleware/error.middleware");

const ACTIVE_STATUSES = ["trial", "active", "expiring_soon"];

/**
 * A subscription gives access only while its status is live.
 * A trial also stops on its end date even if the daily cron has not run yet,
 * so a 5-day trial really is 5 days.
 */
function isSubscriptionLive(subscription) {
  if (!subscription || !ACTIVE_STATUSES.includes(subscription.status)) return false;
  if (
    subscription.status === "trial" &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end) < new Date()
  ) {
    return false;
  }
  return true;
}

function featuresFromSubscription(subscription) {
  if (!isSubscriptionLive(subscription)) return [];
  const features = subscription.plan?.features;
  return Array.isArray(features) ? features : [];
}

/**
 * Features a venue can use RIGHT NOW. Empty array when the venue has no
 * subscription or it is expired/suspended. Never throws for missing data, so
 * it is safe to use on public (unauthenticated) endpoints.
 */
async function getActiveFeatures(venueId) {
  if (!venueId) return [];
  const subscription = await Subscription.findOne({
    where: { venue_id: venueId },
    include: [{ model: Plan, as: "plan" }]
  });
  return featuresFromSubscription(subscription);
}

async function venueHasFeatureFlag(venueId, featureKey) {
  const features = await getActiveFeatures(venueId);
  return features.includes(featureKey);
}

async function venueHasFeature(venueId, featureKey) {
  const venue = await Venue.findByPk(venueId, {
    include: [{ model: Subscription, as: "subscription", include: [{ model: Plan, as: "plan" }] }]
  });
  if (!venue) throw new AppError("Venue not found", 404);

  if (!isSubscriptionLive(venue.subscription)) {
    throw new AppError("Your plan has expired or your free trial has ended. Please renew to continue.", 403);
  }

  const features = venue.subscription?.plan?.features || [];
  if (!features.includes(featureKey)) {
    throw new AppError("Your current plan does not include this feature. Please upgrade your plan.", 403);
  }

  return venue;
}

module.exports = { venueHasFeature, venueHasFeatureFlag, getActiveFeatures, isSubscriptionLive };