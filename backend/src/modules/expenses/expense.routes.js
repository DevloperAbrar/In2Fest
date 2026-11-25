const express = require("express");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { AppError } = require("../../middleware/error.middleware");
const { Venue } = require("../../database/models");
const { schemaReady } = require("../../database/startupMigrations");
const { resolveKind } = require("./expense.sources");
const svc = require("./expense.service");

const router = express.Router({ mergeParams: true });

// Financial data: venue owner only (and Super Admin). Team members and demo accounts never get in.
// Intentionally NOT tied to a subscription plan feature, so every existing vendor gets it with no plan change.
router.use(schemaReady, authenticate, requireVenueOwnership, requireRole("venue_owner", "super_admin"));

router.use(async (req, res, next) => {
  try {
    const venue = await Venue.findByPk(req.params.venueId, { attributes: ["id", "business_category", "secondary_categories"] });
    if (!venue) throw new AppError("Venue not found", 404);
    req.venue = venue;
    req.kind = resolveKind(venue);
    next();
  } catch (e) {
    next(e);
  }
});

const send = (fn, status = 200) => async (req, res, next) => {
  try {
    res.status(status).json({ success: true, data: await fn(req) });
  } catch (e) {
    next(e);
  }
};
const vid = (req) => req.venue.id;

router.get("/meta", send((req) => svc.getMeta(req.venue, req.kind)));
router.get("/overview", send((req) => svc.overview(req.venue, req.kind, req.query.month)));

router.get("/entries", send((req) => svc.listEntries(vid(req), req.query)));
router.post("/entries", send((req) => svc.createEntry(vid(req), req.user, req.body || {}), 201));
router.patch("/entries/:id", send((req) => svc.updateEntry(vid(req), req.params.id, req.body || {})));
router.post("/entries/:id/pay", send((req) => svc.payEntry(vid(req), req.params.id, req.body || {})));
router.delete("/entries/:id", send((req) => svc.deleteEntry(vid(req), req.params.id)));

router.get("/export", async (req, res, next) => {
  try {
    const csv = await svc.exportCsv(vid(req), req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="expenses.csv"');
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

router.get("/recurring", send((req) => svc.listRecurring(vid(req))));
router.post("/recurring", send((req) => svc.createRecurring(vid(req), req.body || {}), 201));
router.patch("/recurring/:id", send((req) => svc.updateRecurring(vid(req), req.params.id, req.body || {})));
router.delete("/recurring/:id", send((req) => svc.deleteRecurring(vid(req), req.params.id)));

router.post("/categories", send((req) => svc.createCategory(vid(req), req.kind, req.body || {}), 201));
router.patch("/categories/:id", send((req) => svc.updateCategory(vid(req), req.params.id, req.body || {})));
router.delete("/categories/:id", send((req) => svc.deleteCategory(vid(req), req.params.id)));

module.exports = router;