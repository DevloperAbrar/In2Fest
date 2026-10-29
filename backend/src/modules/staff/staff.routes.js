// Staff management (gym businesses only). Owner-only: team members and demo accounts are blocked.
const express = require("express");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { AppError } = require("../../middleware/error.middleware");
const { GYM_CATEGORY_SLUGS } = require("../gym/gym.constants");
const svc = require("./staff.service");
const { salaryReceiptPdf } = require("./staff.receipt");

const router = express.Router({ mergeParams: true });

function gymOnly(req, res, next) {
  const v = req.planVenue;
  const cats = v ? [v.business_category, ...(v.secondary_categories || [])] : [];
  if (!cats.some((c) => GYM_CATEGORY_SLUGS.includes(c))) return next(new AppError("Staff management is available only for Gym & Fitness businesses", 403));
  req.staffVenue = v;
  return next();
}

router.use(authenticate, requireVenueOwnership, requireRole("venue_owner"), requirePlanFeature("gym"), gymOnly);

const ctx = (req) => ({ venue: req.staffVenue, user: req.user });
const h = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};

router.get("/", h((req) => svc.list(req.staffVenue.id, req.query)));
router.post("/", h((req) => svc.create(ctx(req), req.body), 201));

// fixed paths must stay ABOVE /:id
router.get("/attendance", h((req) => svc.getAttendance(req.staffVenue.id, req.query.date)));
router.put("/attendance", h((req) => svc.markAttendance(ctx(req), req.body)));
router.get("/payroll", h((req) => svc.payroll(req.staffVenue.id, req.query.month)));
router.post("/payroll/pay-all", h((req) => svc.payAll(ctx(req), req.body)));
router.get("/payments/:id/receipt", async (req, res, next) => {
  try { await salaryReceiptPdf({ venue: req.staffVenue }, req.params.id, res); } catch (e) { next(e); }
});
router.post("/payments/:id/cancel", h((req) => svc.cancelPayment(req.staffVenue.id, req.params.id, req.body)));

router.get("/:id/month", h((req) => svc.staffMonth(req.staffVenue.id, req.params.id, req.query.month)));
router.put("/:id/adjustment", h((req) => svc.setAdjustment(req.staffVenue.id, req.params.id, req.body)));
router.post("/:id/payments", h((req) => svc.recordPayment(ctx(req), req.params.id, req.body), 201));
router.patch("/:id", h((req) => svc.update(req.staffVenue.id, req.params.id, req.body)));
router.delete("/:id", h((req) => svc.remove(req.staffVenue.id, req.params.id)));

module.exports = router;