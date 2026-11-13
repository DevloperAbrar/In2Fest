const { AppError } = require("./error.middleware");
const { isScopeAllowed } = require("../config/teamPermissions");

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

/**
 * Task-level gate inside a module (e.g. gym -> only "attendance").
 * - Owners, super admins: no-op.
 * - Team members WITHOUT a scope list for this module keep full module access (all old members).
 * - Team members WITH a scope list may only call endpoints mapped to their scopes.
 * Mount it right after requireTeamPermission(moduleKey).
 */
function requireTeamScope(moduleKey) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== "team_member") return next();

    const scopes = req.user.permissions && req.user.permissions.scopes;
    const list = scopes && scopes[moduleKey];
    if (!Array.isArray(list)) return next();

    if (!isScopeAllowed(moduleKey, req.method, req.path, list)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
}

module.exports = { requireTeamPermission, requireTeamScope };