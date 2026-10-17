const express = require("express");
const rateLimit = require("express-rate-limit");
const { Venue } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { kickoff, schemaReady } = require("../../database/startupMigrations");
const svc = require("./orders.service");

const router = express.Router();
kickoff();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const msg = (m) => ({ success: false, message: m });

router.use(schemaReady);
router.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false,
  message: msg("Too many requests. Please try again later.")
}));

// Stricter limit for placing orders (stops spam from one device / network).
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false,
  message: msg("Too many orders from this device. Please call the shop.")
});

async function publicVenue(id) {
  const venue = UUID_RE.test(String(id)) ? await Venue.findOne({ where: { id, is_active: true } }) : null;
  if (!venue || !svc.supportsOrders(venue)) throw new AppError("Shop not found", 404);
  return venue;
}

const noStore = (res) => res.set("Cache-Control", "no-store");

// order tracking (secret link). Declared before /:venueId routes.
router.get("/track/:token", async (req, res, next) => {
  try {
    noStore(res);
    res.json({ success: true, data: await svc.trackByToken(req.params.token) });
  } catch (e) { next(e); }
});

router.post("/track/:token/cancel", async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.customerCancel(req.params.token) });
  } catch (e) { next(e); }
});

router.get("/:venueId/config", async (req, res, next) => {
  try {
    const venue = await publicVenue(req.params.venueId);
    noStore(res);
    res.json({ success: true, data: svc.publicConfig(venue, await svc.getSettings(venue.id)) });
  } catch (e) { next(e); }
});

router.post("/:venueId", createLimiter, async (req, res, next) => {
  try {
    if (req.body && req.body.website) return res.status(201).json({ success: true, message: "Thanks!" }); // honeypot
    const venue = await publicVenue(req.params.venueId);
    const settings = await svc.getSettings(venue.id);
    const order = await svc.placeOrder(venue, settings, req.body || {}, req.ip);
    res.status(201).json({ success: true, data: { ...svc.publicView(order, venue, settings), token: order.track_token } });
  } catch (e) { next(e); }
});

module.exports = router;