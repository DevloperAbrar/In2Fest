const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { User, Venue, TeamMember } = require("../database/models");
const { AppError } = require("./error.middleware");

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("No authentication token provided", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.jwt.secret);

    if (decoded.role === "team_member") {
      const teamMember = await TeamMember.findByPk(decoded.id);
      if (!teamMember || !teamMember.is_active) {
        throw new AppError(
          "Your account has been deactivated. Please contact the venue owner.",
          403,
          { code: "ACCOUNT_DEACTIVATED" }
        );
      }

      const venue = await Venue.findByPk(teamMember.venue_id);
      if (!venue || !venue.is_active) {
        throw new AppError(
          "This venue has been deactivated. Please contact support.",
          403,
          { code: "VENUE_DEACTIVATED" }
        );
      }

      req.user = {
        id: teamMember.id,
        email: teamMember.email,
        role: "team_member",
        name: teamMember.name,
        venueId: teamMember.venue_id,
        permissions: teamMember.permissions
      };

      return next();
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      throw new AppError("User not found or inactive", 401);
    }

    if (user.role === "venue_owner") {
      const totalVenues = await Venue.count({ where: { owner_id: user.id } });
      if (totalVenues > 0) {
        const activeVenue = await Venue.findOne({ where: { owner_id: user.id, is_active: true } });
        if (!activeVenue) {
          throw new AppError(
            "Your venue has been deactivated. Please contact support.",
            403,
            { code: "VENUE_DEACTIVATED" }
          );
        }
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new AppError("Invalid or expired token", 401));
    }
    next(error);
  }
}

module.exports = { authenticate };