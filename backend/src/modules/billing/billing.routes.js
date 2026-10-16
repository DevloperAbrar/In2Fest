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
const { getSequelize } = require("../../utils/db");
const inventory = require("../inventory/inventory.service");

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
// NOTE: stock_qty and variant_stock are NOT here on purpose. Stock only changes through the
// stock ledger (inventory.service.js), so every unit can be traced.
const ITEM_FIELDS = [
  "name", "default_price", "description", "item_type", "unit", "hsn_sac", "tax_rate", "sku",
  "track_stock", "is_active",
  "image_url", "category", "variants", "show_on_website",
  "mrp", "offer_label", "offer_ends_at", "brand", "barcode", "cost_price", "low_stock_threshold"
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function money(v, label) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  if (!(n >= 0)) throw new AppError(`${label} must be 0 or more`, 400);
  return n;
}

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
  if (out.brand !== undefined) out.brand = String(out.brand || "").trim().slice(0, 80) || null;
  if (out.barcode !== undefined) out.barcode = String(out.barcode || "").replace(/\s/g, "").slice(0, 50) || null;

  if (out.mrp !== undefined) out.mrp = money(out.mrp, "MRP");
  if (out.cost_price !== undefined) out.cost_price = money(out.cost_price, "Cost price");
  if (out.low_stock_threshold !== undefined) out.low_stock_threshold = money(out.low_stock_threshold, "Low stock level");
  if (out.mrp !== null && out.mrp !== undefined && out.default_price !== undefined && out.mrp < Number(out.default_price)) {
    throw new AppError("MRP can't be lower than the selling price", 400);
  }

  if (out.offer_label !== undefined) out.offer_label = String(out.offer_label || "").trim().slice(0, 60) || null;
  if (out.offer_ends_at !== undefined) out.offer_ends_at = DATE_RE.test(String(out.offer_ends_at || "")) ? out.offer_ends_at : null;

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

  if (out.track_stock !== undefined) out.track_stock = Boolean(out.track_stock);
  if (out.show_on_website !== undefined) out.show_on_website = Boolean(out.show_on_website);
  return out;
}

async function assertUniqueBarcode(venueId, barcode, exceptId) {
  if (!barcode) return;
  const { Op } = require("sequelize");
  const where = { venue_id: venueId, barcode };
  if (exceptId) where.id = { [Op.ne]: exceptId };
  const clash = await ServiceItem.findOne({ where, attributes: ["id", "name"] });
  if (clash) throw new AppError(`Barcode already used by "${clash.name}"`, 400);
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

async function inTransaction(fn) {
  const t = await getSequelize().transaction();
  try {
    const out = await fn(t);
    await t.commit();
    return out;
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

router.post("/service-items", async (req, res, next) => {
  try {
    const body = req.body || {};
    const data = pickItemFields(body);
    if (!data.name) throw new AppError("Item name is required", 400);
    if (data.default_price === undefined) throw new AppError("Item price is required", 400);
    await assertUniqueBarcode(req.params.venueId, data.barcode, null);

    const id = await inTransaction(async (t) => {
      const item = await ServiceItem.create({ ...data, venue_id: req.params.venueId, stock_qty: null }, { transaction: t });
      const opening = Number(body.stock_qty);
      const hasSizes = inventory.variantLabels(item).length > 0;
      // Opening stock goes through the ledger. With sizes it is entered per size on the Inventory page.
      if (item.item_type === "product" && item.track_stock && !hasSizes && opening > 0) {
        await inventory.moveStock({
          venueId: req.params.venueId, itemId: item.id, change: opening, type: "opening",
          note: "Opening stock", userId: req.user?.id, autoTrack: true
        }, t);
      } else if (item.item_type === "product" && item.track_stock) {
        item.stock_qty = 0;
        await item.save({ transaction: t });
      }
      return item.id;
    });

    await syncSetupChecklist(req.params.venueId);
    res.status(201).json({ success: true, data: await ServiceItem.findByPk(id) });
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
    const body = req.body || {};
    const id = await inTransaction(async (t) => {
      const item = await ServiceItem.findOne({
        where: { id: req.params.itemId, venue_id: req.params.venueId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      if (!item) throw new AppError("Item not found", 404);

      const data = pickItemFields(body);
      if (data.barcode !== undefined) await assertUniqueBarcode(req.params.venueId, data.barcode, item.id);
      if (data.mrp === undefined && data.default_price !== undefined && item.mrp !== null && Number(item.mrp) < Number(data.default_price)) {
        throw new AppError("MRP can't be lower than the selling price", 400);
      }
      Object.assign(item, data);

      // Sizes removed or renamed: the item total must follow the sizes that still exist.
      inventory.syncVariantTotal(item);
      await item.save({ transaction: t });

      // A quantity typed in the catalog form becomes a ledger adjustment (not for items with per-size stock).
      const typed = body.stock_qty;
      const hasSizes = inventory.variantLabels(item).length > 0;
      if (item.item_type === "product" && item.track_stock && !hasSizes && typed !== undefined && typed !== null && typed !== "") {
        const target = Number(typed);
        if (target >= 0 && target !== Number(item.stock_qty || 0)) {
          await inventory.moveStock({
            venueId: req.params.venueId, itemId: item.id, setTo: target,
            type: item.stock_qty === null || item.stock_qty === undefined ? "opening" : "adjustment",
            note: "Edited in catalog", userId: req.user?.id, allowNegative: true
          }, t);
        }
      }
      return item.id;
    });

    await syncSetupChecklist(req.params.venueId);
    res.json({ success: true, data: await ServiceItem.findByPk(id) });
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