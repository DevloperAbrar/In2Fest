const { AppError } = require("./error.middleware");

/**
 * Gates a route behind a specific team-member permission.
 * - Venue owners and super admins are untouched  - this middleware is a
 *   no-op for them, so nothing about their access changes.
 * - Team members must be scoped to their own venue AND have the given
 *   feature flag enabled in their `permissions` JSON.
 */
function requireTeamPermission(featureKey) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== "team_member") {
      return next();
    }

    const venueIdInUrl = req.params.venueId || req.params.id;
    if (venueIdInUrl && venueIdInUrl !== req.user.venueId) {
      return next(new AppError("You do not have access to this venue", 403));
    }

    if (!req.user.permissions || req.user.permissions[featureKey] !== true) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }

    next();
  };
}

module.exports = { requireTeamPermission };