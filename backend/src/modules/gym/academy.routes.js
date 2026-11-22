// Mounted inside gym.routes.js at /academy, AFTER the shared guards (authenticate, venue ownership,
// plan feature "gym", team permission/scope, loadGym), so req.gymVenue and req.gymVariant are set.
const express = require("express");
const { requireRole } = require("../../middleware/role.middleware");
const { AppError } = require("../../middleware/error.middleware");
const svc = require("./academy.service");
const extra = require("./academy.extra.service");

const router = express.Router({ mergeParams: true });

const h = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};
const ownerRole = requireRole("venue_owner");
const ownerOnly = (req, res, next) => (req.user && req.user.isDemo ? next() : ownerRole(req, res, next));

// Gym accounts never use these tools.
router.use((req, res, next) =>
  req.gymVariant === "academy" || req.gymVariant === "studio"
    ? next()
    : next(new AppError("This section is available for Sports Academy and Studio accounts only", 403)));

const vid = (req) => req.gymVenue.id;
const variant = (req) => req.gymVariant;

router.get("/config", h((req) => svc.config(vid(req), variant(req))));

// batches (classes for studios)
router.get("/batches", h((req) => svc.listBatches(vid(req), req.query.all === "true")));
router.post("/batches", ownerOnly, h((req) => svc.createBatch(vid(req), variant(req), req.body), 201));
router.get("/batches/:id", h((req) => svc.batchDetail(vid(req), req.params.id)));
router.patch("/batches/:id", ownerOnly, h((req) => svc.updateBatch(vid(req), variant(req), req.params.id, req.body)));
router.delete("/batches/:id", ownerOnly, h((req) => svc.removeBatch(vid(req), req.params.id)));
router.post("/batches/:id/students", h((req) => svc.addStudents(vid(req), req.params.id, req.body && req.body.member_ids)));
router.delete("/batches/:id/students/:memberId", h((req) => svc.removeStudent(vid(req), req.params.id, req.params.memberId)));

// student sport / class profile
router.get("/members/:id/profile", h((req) => svc.getProfile(vid(req), req.params.id, variant(req))));
router.put("/members/:id/profile", h((req) => svc.saveProfile(vid(req), req.params.id, variant(req), req.body)));

// tests and results
router.post("/tests", ownerOnly, h((req) => svc.createTest(vid(req), variant(req), req.body), 201));
router.patch("/tests/:id", ownerOnly, h((req) => svc.updateTest(vid(req), variant(req), req.params.id, req.body)));
router.delete("/tests/:id", ownerOnly, h((req) => svc.deleteTest(vid(req), req.params.id)));
router.get("/members/:id/progress", h((req) => svc.progress(vid(req), variant(req), req.params.id)));
router.post("/members/:id/results", h((req) => svc.recordResults(vid(req), variant(req), req.params.id, req.user, req.body), 201));
router.delete("/results/:id", h((req) => svc.deleteResult(vid(req), req.params.id)));

// drills library
router.get("/drills", h((req) => extra.listDrills(vid(req), variant(req), req.query)));
router.post("/drills", ownerOnly, h((req) => extra.createDrill(vid(req), variant(req), req.body), 201));
router.patch("/drills/:id", ownerOnly, h((req) => extra.updateDrill(vid(req), variant(req), req.params.id, req.body)));
router.delete("/drills/:id", ownerOnly, h((req) => extra.deleteDrill(vid(req), req.params.id)));

// events: tournaments, camps, exams, recitals
router.get("/events", h((req) => extra.listEvents(vid(req))));
router.post("/events", ownerOnly, h((req) => extra.createEvent(vid(req), variant(req), req.body), 201));
router.get("/events/:id", h((req) => extra.eventDetail(vid(req), req.params.id)));
router.patch("/events/:id", ownerOnly, h((req) => extra.updateEvent(vid(req), variant(req), req.params.id, req.body)));
router.delete("/events/:id", ownerOnly, h((req) => extra.removeEvent(vid(req), req.params.id)));
router.post("/events/:id/participants", h((req) => extra.addParticipants(vid(req), req.params.id, req.body && req.body.member_ids)));
router.patch("/events/:id/participants/:memberId", h((req) => extra.updateParticipant(vid(req), req.params.id, req.params.memberId, req.body)));
router.delete("/events/:id/participants/:memberId", h((req) => extra.removeParticipant(vid(req), req.params.id, req.params.memberId)));
router.get("/events/:id/participants/:memberId/certificate", async (req, res, next) => {
  try { await extra.certificatePdf(req.gymVenue, req.params.id, req.params.memberId, res); } catch (e) { next(e); }
});

module.exports = router;