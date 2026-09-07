const { Venue, Subscription, Plan } = require("../database/models");
const { AppError } = require("../middleware/error.middleware");

const ACTIVE_STATUSES = ["trial", "active", "expiring_soon"];

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

module.exports = { venueHasFeature };