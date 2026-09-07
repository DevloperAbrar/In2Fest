const express = require("express");
const passport = require("./google.strategy");
const {
  adminLogin,
  teamMemberLogin,
  googleCallback,
  refreshAccessToken,
  logout,
  getCurrentUser
} = require("./auth.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const env = require("../../config/env");
const { authLimiter } = require("../../middleware/rateLimiter.middleware");

const router = express.Router();

// Super Admin
router.post("/admin/login", authLimiter, adminLogin);

// Team member (email + password, separate from owner's Google login)
router.post("/team-login", authLimiter, teamMemberLogin);

// Venue Owner (Google OAuth)
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
      if (err || !user) {
        const message = (info && info.message) || "Login failed";
        return res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent(message)}`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  googleCallback
);
// Shared
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.get("/me", authenticate, getCurrentUser);

module.exports = router;