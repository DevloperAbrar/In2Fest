const express = require("express");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");
const { upload, uploadToR2 } = require("../../middleware/upload.middleware");
const { AppError } = require("../../middleware/error.middleware");
const { Venue } = require("../../database/models");
const { schemaReady } = require("../../database/startupMigrations");
const C = require("./food.constants");
const core = require("./food.core");
const menu = require("./food.menu.service");
const orders = require("./food.orders.service");
const insights = require("./food.insights.service");
const setup = require("./food.setup.service");

const router = express.Router({ mergeParams: true });

// Loads venue + settings once per request and blocks every non-food business.
async function loadFood(req, res, next) {
  try {
    const venue = req.planVenue || (await Venue.findByPk(req.params.venueId));
    if (!venue) throw new AppError("Venue not found", 404);
    const sub = C.subtypeFor(venue);
    if (!sub) throw new AppError("Restaurant tools are available only for food businesses", 403);
    req.foodVenue = venue;
    req.foodSub = sub;
    req.foodSettings = await core.getSettings(venue.id);
    next();
  } catch (e) { next(e); }
}

router.use(
  schemaReady,
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("food"),
  requireTeamPermission("food"),
  loadFood
);

const ctx = (req) => ({ venue: req.foodVenue, settings: req.foodSettings, user: req.user, sub: req.foodSub });
const vid = (req) => req.foodVenue.id;
const h = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};
const ownerOnly = requireRole("venue_owner");

// what the dashboard needs to know about this business
router.get("/context", h((req) => {
  const v = req.foodVenue;
  const sub = req.foodSub;
  return {
    subtype: { slug: sub.slug, label: sub.label, tables: !!sub.tables, room_tabs: !!sub.roomTabs, unit: sub.unit || null },
    settings: setup.presentSettings(req.foodSettings),
    venue: {
      id: v.id, hall_name: v.hall_name, address: v.address, phone: v.phone, subdomain: v.subdomain,
      gst_enabled: !!v.gst_enabled, gst_number: v.gst_number || "", has_upi: !!v.upi_id
    },
    tax_on: core.taxOn(v, req.foodSettings)
  };
}));
router.put("/settings", ownerOnly, h((req) => setup.updateSettings(vid(req), req.body)));

// reports
router.get("/dashboard", h((req) => insights.dashboard(req.foodVenue, req.foodSettings)));
router.get("/reports", h((req) => insights.reports(req.foodVenue, req.foodSettings, req.query)));
router.get("/reports/export", async (req, res, next) => {
  try {
    const csv = await insights.exportCsv(req.foodVenue, req.query);
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="sales-report.csv"' }).send(csv);
  } catch (e) { next(e); }
});

// menu
router.get("/categories", h((req) => menu.listCategories(vid(req))));
router.post("/categories", ownerOnly, h((req) => menu.createCategory(vid(req), req.body), 201));
router.patch("/categories/:id", ownerOnly, h((req) => menu.updateCategory(vid(req), req.params.id, req.body)));
router.delete("/categories/:id", ownerOnly, h((req) => menu.removeCategory(vid(req), req.params.id)));

router.get("/items", h((req) => menu.listItems(vid(req), req.query)));
router.post("/items/starter-menu", ownerOnly, h((req) => menu.installStarter(req.foodVenue), 201));
router.post("/items", ownerOnly, h((req) => menu.createItem(vid(req), req.body), 201));
router.patch("/items/:id", ownerOnly, h((req) => menu.updateItem(vid(req), req.params.id, req.body)));
router.patch("/items/:id/availability", h((req) => menu.setAvailability(vid(req), req.params.id, req.body.is_available)));
router.delete("/items/:id", ownerOnly, h((req) => menu.removeItem(vid(req), req.params.id)));
router.post("/items/:id/photo", ownerOnly, upload.single("photo"), h(async (req) => {
  if (!req.file) throw new AppError("Choose a photo to upload", 400);
  const url = await uploadToR2(req.file.buffer, req.file.originalname, `food/${vid(req)}`, req.file.mimetype);
  if (!url) throw new AppError("Image storage is not configured", 503);
  return menu.setPhoto(vid(req), req.params.id, url);
}));

// orders  (/board and /preview must stay ABOVE /:id)
router.get("/orders/board", h((req) => orders.board(vid(req))));
router.post("/orders/preview", h((req) => orders.preview(ctx(req), req.body, "owner")));
router.get("/orders", h((req) => orders.list(vid(req), req.query)));
router.post("/orders", h((req) => orders.place(ctx(req), req.body, "owner"), 201));
router.get("/orders/:id", h((req) => orders.get(vid(req), req.params.id)));
router.patch("/orders/:id/status", h((req) => orders.setStatus(vid(req), req.params.id, req.body.status, req.body)));
router.post("/orders/:id/pay", h((req) => orders.pay(vid(req), req.params.id, req.body)));
router.post("/orders/:id/cancel", h((req) => orders.cancel(vid(req), req.params.id, req.body.reason)));

// hotel room tabs
router.get("/room-tabs", h((req) => orders.roomTabs(vid(req))));
router.post("/room-tabs/settle", h((req) => orders.settleRoom(vid(req), req.body.room, req.body.mode)));

// tables + QR
router.get("/tables", h((req) => setup.listTables(vid(req))));
router.post("/tables", ownerOnly, h((req) => setup.createTables(vid(req), req.body), 201));
router.patch("/tables/:id", ownerOnly, h((req) => setup.updateTable(vid(req), req.params.id, req.body)));
router.delete("/tables/:id", ownerOnly, h((req) => setup.deleteTable(vid(req), req.params.id)));
router.get("/tables/:id/qr", async (req, res, next) => {
  try { await setup.tableQr(req.foodVenue, req.params.id, req.query.base, res); } catch (e) { next(e); }
});

// stalls / outlets
router.get("/units", h((req) => setup.listUnits(vid(req))));
router.post("/units", ownerOnly, h((req) => setup.createUnit(vid(req), req.body, req.foodSub), 201));
router.patch("/units/:id", ownerOnly, h((req) => setup.updateUnit(vid(req), req.params.id, req.body)));
router.delete("/units/:id", ownerOnly, h((req) => setup.removeUnit(vid(req), req.params.id)));

// ingredients + stock
router.get("/ingredients", h((req) => setup.listIngredients(vid(req))));
router.post("/ingredients", h((req) => setup.createIngredient(vid(req), req.body), 201));
router.patch("/ingredients/:id", h((req) => setup.updateIngredient(vid(req), req.params.id, req.body)));
router.delete("/ingredients/:id", ownerOnly, h((req) => setup.removeIngredient(vid(req), req.params.id)));
router.post("/ingredients/:id/adjust", h((req) => setup.adjustStock(vid(req), req.params.id, req.body), 201));

// customers
router.get("/customers", h((req) => insights.customers(vid(req), req.query)));
router.get("/customers/:id/message", h((req) => insights.composeMessage(ctx(req), req.params.id, req.query.type)));

module.exports = router;