const express = require("express");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");
const { AppError } = require("../../middleware/error.middleware");
const { kickoff, schemaReady } = require("../../database/startupMigrations");
const { Venue } = require("../../database/models");
const svc = require("./orders.service");

const router = express.Router({ mergeParams: true });

kickoff();

async function loadVenue(req, res, next) {
  try {
    const venue = await Venue.findByPk(req.params.venueId);
    if (!venue) throw new AppError("Venue not found", 404);
    if (!svc.supportsOrders(venue)) throw new AppError("Pickup orders are available for shops and restaurants only", 403);
    req.venue = venue;
    next();
  } catch (e) { next(e); }
}

// Same access rules as Billing (orders turn into bills), so no plan changes are needed.
router.use(
  schemaReady,
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("billing"),
  requireTeamPermission("billing"),
  loadVenue
);

const h = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};
const ownerOnly = requireRole("venue_owner");
const order = (req) => svc.getOwned(req.venue.id, req.params.id);

// settings + counters (static paths must stay ABOVE /:id)
router.get("/settings", h(async (req) => svc.settingsView(await svc.getSettings(req.venue.id))));
router.put("/settings", ownerOnly, h((req) => svc.updateSettings(req.venue.id, req.body)));
router.post("/accepting", h((req) => svc.setAccepting(req.venue.id, req.body.accepting)));
router.get("/summary", h((req) => svc.summary(req.venue.id)));
router.get("/blocked", ownerOnly, h((req) => svc.listBlocked(req.venue.id)));
router.post("/blocked/clear", ownerOnly, h((req) => svc.clearBlocked(req.venue.id, req.body.phone)));
router.get("/lookup", h(async (req) => svc.ownerView(await svc.findByCode(req.venue.id, req.query.code))));

// orders
router.get("/", h((req) => svc.list(req.venue.id, req.query)));
router.get("/:id", h(async (req) => svc.ownerView(await order(req))));
router.patch("/:id", h(async (req) => svc.edit(await order(req), req.body, req.user)));
router.post("/:id/accept", h(async (req) => {
  const s = await svc.getSettings(req.venue.id);
  return svc.accept(await order(req), req.body.prep_minutes, s.default_prep_minutes);
}));
router.post("/:id/eta", h(async (req) => svc.setEta(await order(req), req.body.prep_minutes)));
router.post("/:id/ready", h(async (req) => svc.markReady(await order(req))));
router.post("/:id/cancel", h(async (req) => svc.cancel(await order(req), req.body.reason, "vendor")));
router.post("/:id/no-show", h(async (req) => svc.markNoShow(await order(req))));
router.post("/:id/fake", h(async (req) => svc.markFake(await order(req))));
router.post("/:id/bill", h(async (req) => svc.createBill(req.venue, await order(req))));
router.post("/:id/complete", h(async (req) => svc.complete(req.venue, await order(req), req.user, req.body)));

module.exports = router;