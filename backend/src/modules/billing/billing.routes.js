const express = require("express");
const sharp = require("sharp");
const invoiceController = require("./invoice.controller");
const quotationController = require("./quotation.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { ServiceItem } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");
const { upload, uploadToR2 } = require("../../middleware/upload.middleware");
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
const ITEM_FIELDS = [
  "name", "default_price", "description", "item_type", "unit", "hsn_sac", "tax_rate", "sku",
  "track_stock", "stock_qty", "is_active",
  "image_url", "category", "variants", "show_on_website"
];

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

  if (out.category !== undefined) out.category = String(out.category || "").trim().slice(0, 80) || null;

  if (out.image_url !== undefined) {
    const url = String(out.image_url || "").trim();
    if (url && !/^https?:\/\//i.test(url)) throw new AppError("Invalid image URL", 400);
    out.image_url = url ? url.slice(0, 500) : null;
  }

  if (out.variants !== undefined) {
    const list = Array.isArray(out.variants) ? out.variants : [];
    const seen = new Set();
    out.variants = list
      .map((v) => String(typeof v === "string" ? v : v?.label || "").trim().slice(0, 20))
      .filter((label) => {
        const key = label.toLowerCase();
        if (!label || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 30)
      .map((label) => ({ label }));
  }

  if (out.show_on_website !== undefined) out.show_on_website = Boolean(out.show_on_website);
  return out;
}

// Product photo upload (phone photos are auto-rotated and compressed before storing)
router.post("/service-items/image", upload.single("itemImage"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError("No image uploaded", 400);
    const buffer = await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 1000, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    const url = await uploadToR2(buffer, req.file.originalname, "catalog", "image/webp");
    if (!url) throw new AppError("Storage not configured. Please set R2 credentials.", 500);
    res.json({ success: true, data: { url } });
  } catch (error) { next(error); }
});

// Keeps the dashboard setup checklist in sync after any catalog change.
// A checklist failure must never break the item request itself.
async function syncSetupChecklist(venueId) {
  try {
    const { Venue } = require("../../database/models");
    const { recalculateSetupChecklist } = require("../venues/venue.service"); // lazy: avoids circular import
    const venue = await Venue.findByPk(venueId);
    if (venue) await recalculateSetupChecklist(venue);
  } catch (err) {
    console.error("[billing] setup checklist sync failed:", err.message);
  }
}

router.post("/service-items", async (req, res, next) => {
  try {
    const data = pickItemFields(req.body || {});
    if (!data.name) throw new AppError("Item name is required", 400);
    if (data.default_price === undefined) throw new AppError("Item price is required", 400);
    const item = await ServiceItem.create({ ...data, venue_id: req.params.venueId });
    await syncSetupChecklist(req.params.venueId);
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
    await syncSetupChecklist(req.params.venueId);
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
});

router.delete("/service-items/:itemId", async (req, res, next) => {
  try {
    const item = await ServiceItem.findOne({ where: { id: req.params.itemId, venue_id: req.params.venueId } });
    if (!item) throw new AppError("Item not found", 404);
    await item.destroy();
    await syncSetupChecklist(req.params.venueId);
    res.json({ success: true, message: "Item deleted" });
  } catch (error) { next(error); }
});

module.exports = router;