// Mounted inside gym.routes.js at /data-erase, AFTER the shared guards
// (authenticate, venue ownership, plan feature "gym", loadGym), so req.gymVenue is set.
const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { requireRole } = require("../../middleware/role.middleware");
const { AppError } = require("../../middleware/error.middleware");
const svc = require("./gym.erase.service");

const router = express.Router({ mergeParams: true });

const h = (fn) => async (req, res, next) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};

// Not for demo accounts. In Admin preview the request is allowed, and the Super Admin
// who is "viewing as" the vendor is identified so THEIR identity is verified (not the vendor's).
function prepare(req, res, next) {
  try {
    if (req.user && req.user.isDemo) throw new AppError("Data erase is disabled in the demo account.", 403);
    const header = req.headers.authorization || "";
    const decoded = header.startsWith("Bearer ") ? jwt.decode(header.slice(7)) : null; // already verified by authenticate
    req.eraseAdminId = decoded && decoded.impersonated_by ? decoded.impersonated_by : null;
    next();
  } catch (e) { next(e); }
}

// Only FAILED attempts are counted (wrong password / bad phrase).
const attemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `gym-erase:${req.eraseAdminId || req.user.id}`,
  message: { success: false, message: "Too many wrong attempts. Please wait 15 minutes and try again." }
});

router.use(requireRole("venue_owner"), prepare);

router.get("/summary", h((req) => svc.summary(req.gymVenue.id, req.user.id, req.eraseAdminId)));

router.post("/verify", attemptLimiter, h((req) => svc.verifyIdentity({
  venue: req.gymVenue, userId: req.user.id, adminId: req.eraseAdminId,
  scopes: req.body?.scopes, password: req.body?.password, email: req.body?.email
})));

router.post("/execute", attemptLimiter, h((req) => svc.execute({
  venue: req.gymVenue, user: req.user, adminId: req.eraseAdminId,
  scopes: req.body?.scopes, token: req.body?.token, phrase: req.body?.phrase, acknowledge: req.body?.acknowledge
})));

module.exports = router;