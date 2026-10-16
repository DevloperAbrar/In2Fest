const express = require("express");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");
const { upload, uploadToR2 } = require("../../middleware/upload.middleware");
const { AppError } = require("../../middleware/error.middleware");
const { Venue } = require("../../database/models");
const C = require("./gym.constants");
const members = require("./gym.members.service");
const payments = require("./gym.payments.service");
const insights = require("./gym.insights.service");
const messages = require("./gym.messages.service");
const receipt = require("./gym.receipt");
const card = require("./gym.card");
const workout = require("./gym.workout.service");

const router = express.Router({ mergeParams: true });

// Loads the venue + settings once per request and blocks non-gym businesses.
async function loadGym(req, res, next) {
  try {
    const venue = await Venue.findByPk(req.params.venueId);
    if (!venue) throw new AppError("Venue not found", 404);
    const cats = [venue.business_category, ...(venue.secondary_categories || [])];
    if (!cats.some((c) => C.GYM_CATEGORY_SLUGS.includes(c))) throw new AppError("Gym tools are available only for Gym & Fitness businesses", 403);
    req.gymVenue = venue;
    req.gymSettings = await insights.getSettings(venue.id);
    next();
  } catch (e) { next(e); }
}

router.use(
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("gym"),
  requireTeamPermission("gym"),
  loadGym
);

const ctx = (req) => ({ venue: req.gymVenue, settings: req.gymSettings, user: req.user });
const h = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};
const ownerOnly = requireRole("venue_owner");

// overview + settings
router.get("/dashboard", h((req) => insights.dashboard(req.gymVenue.id)));
router.get("/settings", h((req) => insights.publicSettings(req.gymSettings)));
router.put("/settings", ownerOnly, h((req) => insights.updateSettings(req.gymVenue.id, req.body)));

// membership plans
router.get("/plans", h((req) => members.listPlans(req.gymVenue.id, req.query.all === "true")));
router.post("/plans", ownerOnly, h((req) => members.createPlan(req.gymVenue.id, req.body), 201));
router.patch("/plans/:id", ownerOnly, h((req) => members.updatePlan(req.gymVenue.id, req.params.id, req.body)));
router.delete("/plans/:id", ownerOnly, h((req) => members.deletePlan(req.gymVenue.id, req.params.id)));

// members  (/members/export must stay ABOVE /members/:id)
router.get("/members/export", async (req, res, next) => {
  try {
    const csv = await members.exportMembers(req.gymVenue.id, req.query);
    const tag = ["active", "expiring", "expired", "frozen", "dues", "new"].includes(req.query.status) ? req.query.status : "all";
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="gym-members-${tag}.csv"` }).send(csv);
  } catch (e) { next(e); }
});
router.get("/members", h((req) => members.listMembers(req.gymVenue.id, req.query)));
router.post("/members", h((req) => members.enroll(ctx(req), req.body), 201));
router.get("/members/:id", h((req) => members.getDetail(ctx(req), req.params.id)));
router.get("/members/:id/message", h((req) => messages.compose(ctx(req), req.params.id, req.query)));
router.get("/members/:id/card", async (req, res, next) => {
  try { await card.memberCardPng(ctx(req), req.params.id, res); } catch (e) { next(e); }
});
router.patch("/members/:id", h((req) => members.updateMember(req.gymVenue.id, req.params.id, req.body)));
router.delete("/members/:id", h((req) => members.archiveMember(req.gymVenue.id, req.params.id)));
router.post("/members/:id/photo", upload.single("photo"), h(async (req) => {
  if (!req.file) throw new AppError("Choose a photo to upload", 400);
  const url = await uploadToR2(req.file.buffer, req.file.originalname, `gym/${req.gymVenue.id}`, req.file.mimetype);
  if (!url) throw new AppError("Image storage is not configured", 503);
  return members.setPhoto(req.gymVenue.id, req.params.id, url);
}));
router.post("/members/:id/renew", h((req) => members.renew(ctx(req), req.params.id, req.body), 201));
router.post("/members/:id/freeze", h((req) => members.freeze(req.gymVenue.id, req.params.id, req.body)));
router.post("/members/:id/unfreeze", h((req) => members.unfreeze(req.gymVenue.id, req.params.id)));
router.post("/members/:id/payments", h((req) => payments.recordManual(ctx(req), req.params.id, req.body), 201));
router.post("/members/:id/payment-link", h((req) => payments.linkForMember(ctx(req), req.params.id, req.body)));

// payments
router.get("/payments", h((req) => payments.listPayments(req.gymVenue.id, req.query)));
router.get("/payments/:id/receipt", async (req, res, next) => {
  try { await receipt.receiptPdf(ctx(req), req.params.id, res); } catch (e) { next(e); }
});
router.post("/payments/:id/confirm", h((req) => payments.confirm(ctx(req), req.params.id, req.body)));
router.post("/payments/:id/cancel", h((req) => payments.cancel(ctx(req), req.params.id)));
router.post("/payments/:id/refresh", h((req) => payments.refresh(ctx(req), req.params.id)));

// workouts
router.get("/exercises", h((req) => workout.listExercises(req.gymVenue.id, req.query)));
router.post("/exercises", h((req) => workout.createExercise(req.gymVenue.id, req.body), 201));
router.patch("/exercises/:id", h((req) => workout.updateExercise(req.gymVenue.id, req.params.id, req.body)));
router.delete("/exercises/:id", h((req) => workout.deleteExercise(req.gymVenue.id, req.params.id)));
router.post("/workout-plans/starter-templates", h((req) => workout.installStarters(req.gymVenue.id), 201));
router.get("/workout-plans", h((req) => workout.listPlans(req.gymVenue.id, req.query)));
router.post("/workout-plans", h((req) => workout.createPlan(req.gymVenue.id, req.body), 201));
router.get("/workout-plans/:id", h((req) => workout.getPlan(req.gymVenue.id, req.params.id)));
router.patch("/workout-plans/:id", h((req) => workout.updatePlan(req.gymVenue.id, req.params.id, req.body)));
router.delete("/workout-plans/:id", h((req) => workout.deletePlan(req.gymVenue.id, req.params.id)));
router.post("/workout-plans/:id/assign", h((req) => workout.assign(ctx(req), req.params.id, req.body.member_ids), 201));

// free-trial leads
router.get("/leads", h((req) => insights.listLeads(req.gymVenue.id, req.query)));
router.patch("/leads/:id", h((req) => insights.updateLead(req.gymVenue.id, req.params.id, req.body)));

module.exports = router;