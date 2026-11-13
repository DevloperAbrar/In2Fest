const express = require("express");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission, requireTeamScope } = require("../../middleware/teamPermission.middleware");
const { upload, uploadToR2 } = require("../../middleware/upload.middleware");
const { AppError } = require("../../middleware/error.middleware");
const { Venue } = require("../../database/models");
const C = require("./library.constants");
const insights = require("./library.insights.service");
const halls = require("./library.halls.service");
const shifts = require("./library.shifts.service");
const students = require("./library.students.service");
const payments = require("./library.payments.service");
const att = require("./library.attendance.service");
const card = require("./library.card");
const books = require("./library.books.service");
const reminders = require("./library.reminders.service");

const router = express.Router({ mergeParams: true });

// Loads the venue + settings once per request and blocks non-library businesses.
async function loadLibrary(req, res, next) {
  try {
    const venue = await Venue.findByPk(req.params.venueId);
    if (!venue) throw new AppError("Venue not found", 404);
    const cats = [venue.business_category, ...(venue.secondary_categories || [])];
    if (!cats.some((c) => C.LIB_CATEGORY_SLUGS.includes(c)) && !require("../../config/vendorSegments").categoriesInSegment(cats, "library")) throw new AppError("Library tools are available only for Library businesses", 403);
    req.libVenue = venue;
    req.libSettings = await insights.getSettings(venue.id);
    next();
  } catch (e) { next(e); }
}

router.use(
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("library"),
    requireTeamPermission("library"),
  requireTeamScope("library"),
  loadLibrary
);

const ctx = (req) => ({ venue: req.libVenue, settings: req.libSettings, user: req.user });
const h = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};
const ownerOnly = requireRole("venue_owner");

/* dashboard + settings */
router.get("/dashboard", h((req) => insights.dashboard(req.libVenue.id, req.libSettings)));
router.get("/settings", h((req) => insights.publicSettings(req.libSettings)));
router.put("/settings", ownerOnly, h((req) => insights.updateSettings(req.libVenue.id, req.body || {})));
router.post("/settings/regenerate-qr", ownerOnly, h((req) => insights.regenerateQr(req.libVenue.id)));

/* halls */
router.get("/halls", h((req) => halls.list(req.libVenue.id, req.query.all === "true")));
router.post("/halls", ownerOnly, h((req) => halls.create(req.libVenue.id, req.body || {}), 201));
router.get("/halls/:id/seatmap", h((req) => halls.seatmap(req.libVenue.id, req.params.id, req.query.shift_id)));
router.patch("/halls/:id", ownerOnly, h((req) => halls.update(req.libVenue.id, req.params.id, req.body || {})));
router.delete("/halls/:id", ownerOnly, h((req) => halls.remove(req.libVenue.id, req.params.id)));

/* shifts */
router.get("/shifts", h((req) => shifts.list(req.libVenue.id, req.query.all === "true")));
router.post("/shifts", ownerOnly, h((req) => shifts.create(req.libVenue.id, req.body || {}), 201));
router.patch("/shifts/:id", ownerOnly, h((req) => shifts.update(req.libVenue.id, req.params.id, req.body || {})));
router.delete("/shifts/:id", ownerOnly, h((req) => shifts.remove(req.libVenue.id, req.params.id)));

/* students  (fixed paths like /export and /import must stay ABOVE /students/:id) */
router.get("/students/export", async (req, res, next) => {
  try {
    const csv = await students.exportCsv(req.libVenue.id, req.query);
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="library-students.csv"' }).send(csv);
  } catch (e) { next(e); }
});
router.post("/students/import", ownerOnly, h((req) => students.importRows(ctx(req), (req.body || {}).rows)));
router.get("/students", h((req) => students.list(req.libVenue.id, req.query)));
router.post("/students", h((req) => students.enroll(ctx(req), req.body || {}), 201));
router.get("/students/:id", h((req) => students.detail(ctx(req), req.params.id)));
router.patch("/students/:id", h((req) => students.update(ctx(req), req.params.id, req.body || {})));
router.get("/students/:id/aadhaar", ownerOnly, h((req) => students.revealAadhaar(req.libVenue.id, req.params.id)));
router.post("/students/:id/photo", upload.single("photo"), h(async (req) => {
  if (!req.file) throw new AppError("Choose a photo to upload", 400);
  const url = await uploadToR2(req.file.buffer, req.file.originalname, `library/${req.libVenue.id}`, req.file.mimetype);
  if (!url) throw new AppError("Image storage is not configured", 503);
  return students.setPhoto(req.libVenue.id, req.params.id, url);
}));
router.post("/students/:id/renew", h((req) => students.renew(ctx(req), req.params.id, req.body || {}), 201));
router.post("/students/:id/move", h((req) => students.move(ctx(req), req.params.id, req.body || {})));
router.post("/students/:id/freeze", h((req) => students.freeze(req.libVenue.id, req.params.id)));
router.post("/students/:id/unfreeze", h((req) => students.unfreeze(req.libVenue.id, req.params.id)));
router.post("/students/:id/leave", h((req) => students.leave(req.libVenue.id, req.params.id)));
router.post("/students/:id/payments", h((req) => payments.record(ctx(req), req.params.id, req.body || {}), 201));
router.get("/students/:id/attendance", h((req) => att.studentMonth(req.libVenue.id, req.params.id, req.query.month)));
router.get("/students/:id/loans", h((req) => books.studentLoans(req.libVenue.id, req.libSettings, req.params.id)));
router.get("/students/:id/card", async (req, res, next) => {
  try { await card.studentCardPng(ctx(req), req.params.id, res); } catch (e) { next(e); }
});
router.delete("/students/:id/permanent", ownerOnly, h((req) => students.removePermanent(req.libVenue.id, req.params.id, req.query.confirm)));
router.delete("/students/:id", h((req) => students.archive(req.libVenue.id, req.params.id)));

/* payments */
router.get("/payments", h((req) => payments.ledger(req.libVenue.id, req.query)));
router.post("/payments/:id/void", ownerOnly, h((req) => payments.voidPayment(ctx(req), req.params.id, (req.body || {}).reason)));
router.get("/payments/:id/receipt", async (req, res, next) => {
  try { await payments.receiptPdf(ctx(req), req.params.id, res); } catch (e) { next(e); }
});

/* attendance */
router.get("/attendance", h((req) => att.day(req.libVenue.id, req.libSettings, req.query.date, req.query.shift_id)));
router.post("/attendance/mark", h((req) => att.mark(ctx(req), req.body || {})));
router.post("/attendance/mark-all", h((req) => att.markAll(ctx(req), req.body || {})));
router.post("/attendance/checkout", h((req) => att.checkout(ctx(req), req.body || {})));
router.get("/attendance/qr.png", async (req, res, next) => {
  try { res.set({ "Content-Type": "image/png", "Cache-Control": "private, no-store" }).send(await att.staticQrPng(req.libVenue.id)); } catch (e) { next(e); }
});
router.get("/attendance/poster.pdf", async (req, res, next) => {
  try { await att.posterPdf(req.libVenue, req.libSettings, res); } catch (e) { next(e); }
});

/* books  (/books/import must stay ABOVE /books/:id) */
router.get("/books", h((req) => books.list(req.libVenue.id, req.query)));
router.post("/books", h((req) => books.create(req.libVenue.id, req.body || {}), 201));
router.post("/books/import", h((req) => books.importBooks(req.libVenue.id, (req.body || {}).rows)));
router.patch("/books/:id", h((req) => books.update(req.libVenue.id, req.params.id, req.body || {})));
router.delete("/books/:id", ownerOnly, h((req) => books.remove(req.libVenue.id, req.params.id)));
router.post("/books/:id/issue", h((req) => books.issue(ctx(req), req.params.id, req.body || {}), 201));

/* loans */
router.get("/loans", h((req) => books.listLoans(req.libVenue.id, req.libSettings, req.query)));
router.post("/loans/:id/return", h((req) => books.returnLoan(ctx(req), req.params.id, req.body || {})));
router.post("/loans/:id/renew", h((req) => books.renewLoan(ctx(req), req.params.id)));
router.post("/loans/:id/lost", h((req) => books.markLost(ctx(req), req.params.id, req.body || {})));
router.post("/loans/:id/fine", h((req) => books.collectFine(ctx(req), req.params.id, req.body || {})));
router.post("/loans/:id/waive", ownerOnly, h((req) => books.waiveFine(ctx(req), req.params.id)));

/* WhatsApp reminders */
router.get("/reminders", h((req) => reminders.list(ctx(req))));
router.post("/reminders/mark", h((req) => reminders.mark(ctx(req), req.body || {})));

module.exports = router;