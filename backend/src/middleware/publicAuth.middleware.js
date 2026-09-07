const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { PublicUser, User } = require("../database/models");
const { AppError } = require("./error.middleware");

/** Requires a valid public-user (site visitor) session. */
async function authenticatePublicUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Please sign in to continue", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.jwt.secret);

    if (decoded.type !== "public_user") {
      throw new AppError("Invalid session", 401);
    }

    const user = await PublicUser.findByPk(decoded.id);
    if (!user) throw new AppError("User not found", 401);

    req.publicUser = { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url };
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new AppError("Invalid or expired session", 401));
    }
    next(error);
  }
}

/**
 * Used only on the review-submission endpoint. Accepts EITHER a public-user
 * session (regular site visitor) OR a vendor session (a logged-in venue owner
 * writing a review on someone else's listing) and normalizes both into
 * req.reviewer = { type: "visitor" | "vendor", id, name, email }.
 * Writing a review now requires being signed in one way or the other.
 */
async function identifyReviewer(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Please sign in to write a review", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.jwt.secret);

    if (decoded.type === "public_user") {
      const user = await PublicUser.findByPk(decoded.id);
      if (!user) throw new AppError("User not found", 401);
      req.reviewer = { type: "visitor", id: user.id, name: user.name, email: user.email };
    } else {
      // Vendor access tokens carry a `role` claim instead of `type`
      const user = await User.findByPk(decoded.id);
      if (!user || !user.is_active) throw new AppError("User not found", 401);
      req.reviewer = { type: "vendor", id: user.id, name: user.name, email: user.email };
    }

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new AppError("Invalid or expired session", 401));
    }
    next(error);
  }
}

module.exports = { authenticatePublicUser, identifyReviewer };