const express = require("express");
const invoiceController = require("./invoice.controller");
const quotationController = require("./quotation.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { ServiceItem } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");
const { kickoff, schemaReady } = require("../../database/startupMigrations");

const router = express.Router({ mergeParams: true });

kickoff(); // start applying schema upgrades as soon as the app boots

router.use(
  schemaReady,
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("billing"),
  requireTeamPermission("billing")
);

// Invoices, Quotations, Proformas, Credit Notes (shared endpoint; `type` in the body decides)
router.post("/invoices", invoiceController.createInvoice);
router.get("/invoices", invoiceController.getInvoices);
router.get("/invoices/:invoiceId", invoiceController.getInvoice);
router.patch("/invoices/:invoiceId", invoiceController.updateInvoice);
router.delete("/invoices/:invoiceId", invoiceController.deleteInvoice);
router.post("/invoices/:invoiceId/share", invoiceController.shareViaWhatsapp);
router.post("/invoices/:invoiceId/payments", invoiceController.recordPayment);

router.get("/quotations", quotationController.getQuotations);
router.post("/quotations/:quotationId/convert", quotationController.convertQuotationToInvoice);

// ---- Item catalog (products + services) ----
const ITEM_FIELDS = ["name", "default_price", "description", "item_type", "unit", "hsn_sac", "tax_rate", "sku", "track_stock", "stock_qty", "is_active"];

function pickItemFields(body) {
  const out = {};
  ITEM_FIELDS.forEach((k) => {
    if (body[k] !== undefined) out[k] = body[k];
  });

  if (out.name !== undefined) {
    out.name = String(out.name || "").trim().slice(0, 150);
    if (!out.name) throw new AppError("Item name is required", 400);
  }
  if (out.default_price !== undefined && !(Number(out.default_price) >= 0)) {
    throw new AppError("Item price must be 0 or more", 400);
  }
  if (out.tax_rate === "" || out.tax_rate === null) out.tax_rate = null;
  if (out.tax_rate !== undefined && out.tax_rate !== null && !(Number(out.tax_rate) >= 0 && Number(out.tax_rate) <= 100)) {
    throw new AppError("Tax rate must be between 0 and 100", 400);
  }
  if (out.item_type !== undefined && !["service", "product"].includes(out.item_type)) out.item_type = "service";
  if (out.unit !== undefined) out.unit = String(out.unit || "").slice(0, 20) || null;
  if (out.hsn_sac !== undefined) out.hsn_sac = String(out.hsn_sac || "").replace(/\s/g, "").slice(0, 10) || null;
  if (out.sku !== undefined) out.sku = String(out.sku || "").slice(0, 50) || null;
  return out;
}

router.post("/service-items", async (req, res, next) => {
  try {
    const data = pickItemFields(req.body || {});
    if (!data.name) throw new AppError("Item name is required", 400);
    if (data.default_price === undefined) throw new AppError("Item price is required", 400);
    const item = await ServiceItem.create({ ...data, venue_id: req.params.venueId });
    res.status(201).json({ success: true, data: item });
  } catch (error) { next(error); }
});

router.get("/service-items", async (req, res, next) => {
  try {
    const where = { venue_id: req.params.venueId };
    if (req.query.item_type === "product" || req.query.item_type === "service") where.item_type = req.query.item_type;
    const items = await ServiceItem.findAll({ where, order: [["name", "ASC"]] });
    res.json({ success: true, data: items });
  } catch (error) { next(error); }
});

router.patch("/service-items/:itemId", async (req, res, next) => {
  try {
    const item = await ServiceItem.findOne({ where: { id: req.params.itemId, venue_id: req.params.venueId } });
    if (!item) throw new AppError("Item not found", 404);
    Object.assign(item, pickItemFields(req.body || {}));
    await item.save();
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
});

router.delete("/service-items/:itemId", async (req, res, next) => {
  try {
    const item = await ServiceItem.findOne({ where: { id: req.params.itemId, venue_id: req.params.venueId } });
    if (!item) throw new AppError("Item not found", 404);
    await item.destroy();
    res.json({ success: true, message: "Item deleted" });
  } catch (error) { next(error); }
});

module.exports = router;