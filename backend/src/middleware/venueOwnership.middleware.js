const { Venue } = require("../database/models");
const { AppError } = require("./error.middleware");

async function requireVenueOwnership(req, res, next) {
  try {
    const venueId = req.params.venueId || req.params.id;
    if (!venueId) return next(new AppError("Venue ID missing from request", 400));

    if (req.user.role === "super_admin") return next();

    if (req.user.role === "team_member") {
      if (req.user.venueId !== venueId) {
        return next(new AppError("You do not have access to this venue", 403));
      }
      return next();
    }

    if (req.user.role === "venue_owner") {
      const venue = await Venue.findOne({ where: { id: venueId, owner_id: req.user.id } });
      if (!venue) {
        return next(new AppError("Venue not found or access denied", 404));
      }
      return next();
    }

    return next(new AppError("Access denied", 403));
  } catch (error) {
    next(error);
  }
}

module.exports = { requireVenueOwnership };