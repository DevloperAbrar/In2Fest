const { venueHasFeature } = require("../utils/planAccess");

function requirePlanFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const venueId = req.params.venueId || req.params.id;
      // Keep the venue it already loaded so later middleware does not query it again.
      req.planVenue = await venueHasFeature(venueId, featureKey);
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { requirePlanFeature };