// Mounted inside gym.routes.js at /body, AFTER the shared guards (authenticate, venue ownership,
// plan feature "gym", team permission/scope, loadGym), so req.gymVenue and req.gymVariant are set.
const express = require("express");
const { AppError } = require("../../middleware/error.middleware");
const svc = require("./body.service");
const report = require("./body.report");
const { venueHasFeature } = require("../../utils/planAccess");

const router = express.Router({ mergeParams: true });

const h = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};

// Sports Academy and Studio accounts have their own Progress tool.
router.use((req, res, next) =>
  req.gymVariant === "gym" ? next() : next(new AppError("Body measurement is available for Gym accounts only", 403)));

// Body Measurement is a paid add-on: only a vendor who has "gym_body" (in the plan, bought, or given by the
// Super Admin) gets in. This is the real lock; hiding the menu on the frontend is only for looks.
router.use(async (req, res, next) => {
  try {
    await venueHasFeature(req.gymVenue.id, "gym_body");
    next();
  } catch (e) {
    next(e);
  }
});

const vid = (req) => req.gymVenue.id;

router.get("/config", h(() => svc.config()));
router.get("/summary", h((req) => svc.summary(vid(req), req.query.ids)));
router.get("/members/:id", h((req) => svc.memberView(vid(req), req.params.id)));
router.post("/members/:id/records", h((req) => svc.saveRecord(vid(req), req.params.id, req.user, req.body), 201));
router.delete("/records/:id", h((req) => svc.deleteRecord(vid(req), req.params.id)));
router.get("/members/:id/report", async (req, res, next) => {
  try { await report.bodyReportPdf(req.gymVenue, req.params.id, req.query.unit === "in" ? "in" : "cm", res); } catch (e) { next(e); }
});

module.exports = router;