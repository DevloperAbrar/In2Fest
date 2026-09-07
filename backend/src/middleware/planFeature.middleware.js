const { venueHasFeature } = require("../utils/planAccess");

function requirePlanFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const venueId = req.params.venueId || req.params.id;
      await venueHasFeature(venueId, featureKey);
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { requirePlanFeature };