const { Venue, Subscription, Plan } = require("../database/models");
const { AppError } = require("../middleware/error.middleware");

const ACTIVE_STATUSES = ["trial", "active", "expiring_soon"];

function featuresFromSubscription(subscription) {
  if (!subscription || !ACTIVE_STATUSES.includes(subscription.status)) return [];
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

  const status = venue.subscription?.status;
  const features = venue.subscription?.plan?.features || [];

  if (!ACTIVE_STATUSES.includes(status) || !features.includes(featureKey)) {
    throw new AppError("Your current plan does not include this feature. Please upgrade your plan.", 403);
  }

  return venue;
}

module.exports = { venueHasFeature, venueHasFeatureFlag, getActiveFeatures };