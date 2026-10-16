const express = require("express");
const { Op } = require("sequelize");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");
const { AppError } = require("../../middleware/error.middleware");
const { Venue, ServiceItem } = require("../../database/models");
const { getBusinessTypeKey } = require("../../config/businessTypes");
const { getSequelize } = require("../../utils/db");
const { schemaReady } = require("../../database/startupMigrations");
const { StockMovement, Supplier, Purchase } = require("./inventory.models");
const inv = require("./inventory.service");

const router = express.Router({ mergeParams: true });
const { UUID_RE, r2 } = inv;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.use(
  schemaReady,
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("billing"),
  requireTeamPermission("billing")
);

// Inventory is a shop feature. Gyms, venues, photographers etc. never see it.
router.use(async (req, res, next) => {
  try {
    const venue = await Venue.findByPk(req.params.venueId);
    if (!venue) throw new AppError("Venue not found", 404);
    if (getBusinessTypeKey(venue.business_category) !== "retail") {
      throw new AppError("Inventory is available for shops only", 403);
    }
    req.venue = venue;
    next();
  } catch (e) {
    next(e);
  }
});

const vid = (req) => req.params.venueId;

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

function toStockRow(i) {
  const qty = Number(i.stock_qty || 0);
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    brand: i.brand,
    sku: i.sku,
    barcode: i.barcode,
    unit: i.unit,
    image_url: i.image_url,
    default_price: Number(i.default_price),
    mrp: i.mrp !== null && i.mrp !== undefined ? Number(i.mrp) : null,
    cost_price: i.cost_price !== null && i.cost_price !== undefined ? Number(i.cost_price) : null,
    track_stock: i.track_stock,
    stock_qty: qty,
    low_stock_threshold: i.low_stock_threshold !== null && i.low_stock_threshold !== undefined ? Number(i.low_stock_threshold) : null,
    variants: inv.variantLabels(i),
    variant_stock: i.variant_stock || {},
    is_active: i.is_active,
    stock_status: inv.stockStatus(i),
    stock_value: r2(Math.max(qty, 0) * Number(i.cost_price || i.default_price || 0))
  };
}

// ---- overview + stock list -----------------------------------------------------------------

router.get("/overview", async (req, res, next) => {
  try {
    res.json({ success: true, data: await inv.overview(vid(req)) });
  } catch (e) { next(e); }
});

router.get("/stock", async (req, res, next) => {
  try {
    const rows = await ServiceItem.findAll({
      where: { venue_id: vid(req), item_type: "product" },
      order: [["name", "ASC"]],
      limit: 1000
    });
    res.json({ success: true, data: rows.map(toStockRow) });
  } catch (e) { next(e); }
});

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get("/stock/export", async (req, res, next) => {
  try {
    const rows = (await ServiceItem.findAll({
      where: { venue_id: vid(req), item_type: "product" },
      order: [["name", "ASC"]],
      limit: 5000
    })).map(toStockRow);

    const head = ["Name", "Category", "Brand", "SKU", "Barcode", "Unit", "Selling price", "MRP", "Cost price", "Stock", "Status", "Sizes", "Stock value"];
    const lines = rows.map((r) => [
      r.name, r.category, r.brand, r.sku, r.barcode, r.unit, r.default_price, r.mrp, r.cost_price,
      r.track_stock ? r.stock_qty : "",
      r.stock_status,
      r.variants.map((l) => `${l}:${Number(r.variant_stock[l] || 0)}`).join(" "),
      r.stock_value
    ].map(csvCell).join(","));

    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="stock-report.csv"',
      "Cache-Control": "no-store"
    });
    res.send("\uFEFF" + [head.join(","), ...lines].join("\r\n"));
  } catch (e) { next(e); }
});

// ---- adjustments + history -----------------------------------------------------------------

router.post("/items/:itemId/adjust", async (req, res, next) => {
  try {
    if (!UUID_RE.test(req.params.itemId)) throw new AppError("Product not found", 404);
    const item = await inv.adjust(vid(req), req.params.itemId, req.body || {}, req.user?.id);
    res.json({ success: true, data: toStockRow(item) });
  } catch (e) { next(e); }
});

router.get("/movements", async (req, res, next) => {
  try {
    const where = { venue_id: vid(req) };
    if (req.query.item_id && UUID_RE.test(String(req.query.item_id))) where.item_id = req.query.item_id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 300);
    const rows = await StockMovement.findAll({ where, order: [["createdAt", "DESC"]], limit });

    const ids = [...new Set(rows.map((r) => r.item_id))];
    const items = ids.length ? await ServiceItem.findAll({ where: { id: { [Op.in]: ids } }, attributes: ["id", "name"] }) : [];
    const names = Object.fromEntries(items.map((i) => [i.id, i.name]));
    res.json({ success: true, data: rows.map((r) => ({ ...r.toJSON(), item_name: names[r.item_id] || "Deleted product" })) });
  } catch (e) { next(e); }
});

// ---- suppliers -----------------------------------------------------------------------------

function pickSupplier(b) {
  const name = String(b.name || "").trim().slice(0, 150);
  if (!name) throw new AppError("Supplier name is required", 400);
  const gstin = String(b.gstin || "").trim().toUpperCase().slice(0, 15);
  if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) throw new AppError("Supplier GSTIN is not valid", 400);
  return {
    name,
    phone: String(b.phone || "").trim().slice(0, 20) || null,
    gstin: gstin || null,
    address: String(b.address || "").trim().slice(0, 300) || null,
    notes: String(b.notes || "").trim().slice(0, 300) || null
  };
}

router.get("/suppliers", async (req, res, next) => {
  try {
    const [suppliers, purchases] = await Promise.all([
      Supplier.findAll({ where: { venue_id: vid(req), is_active: true }, order: [["name", "ASC"]] }),
      Purchase.findAll({ where: { venue_id: vid(req), status: "active" }, attributes: ["supplier_id", "total", "amount_paid"], limit: 5000 })
    ]);
    const due = {};
    purchases.forEach((p) => {
      if (p.supplier_id) due[p.supplier_id] = r2((due[p.supplier_id] || 0) + Number(p.total) - Number(p.amount_paid));
    });
    res.json({ success: true, data: suppliers.map((s) => ({ ...s.toJSON(), balance_due: due[s.id] || 0 })) });
  } catch (e) { next(e); }
});

router.post("/suppliers", async (req, res, next) => {
  try {
    const s = await Supplier.create({ ...pickSupplier(req.body || {}), venue_id: vid(req) });
    res.status(201).json({ success: true, data: s });
  } catch (e) { next(e); }
});

router.patch("/suppliers/:id", async (req, res, next) => {
  try {
    const s = await Supplier.findOne({ where: { id: req.params.id, venue_id: vid(req) } });
    if (!s) throw new AppError("Supplier not found", 404);
    await s.update(pickSupplier({ ...s.toJSON(), ...(req.body || {}) }));
    res.json({ success: true, data: s });
  } catch (e) { next(e); }
});

router.delete("/suppliers/:id", async (req, res, next) => {
  try {
    const s = await Supplier.findOne({ where: { id: req.params.id, venue_id: vid(req) } });
    if (!s) throw new AppError("Supplier not found", 404);
    await s.update({ is_active: false }); // soft delete: old purchases keep their supplier name
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ---- purchases (stock in) ------------------------------------------------------------------

router.get("/purchases", async (req, res, next) => {
  try {
    const rows = await Purchase.findAll({ where: { venue_id: vid(req) }, order: [["createdAt", "DESC"]], limit: 200 });
    const ids = [...new Set(rows.map((r) => r.supplier_id).filter(Boolean))];
    const sups = ids.length ? await Supplier.findAll({ where: { id: { [Op.in]: ids } }, attributes: ["id", "name"] }) : [];
    const names = Object.fromEntries(sups.map((s) => [s.id, s.name]));
    res.json({ success: true, data: rows.map((r) => ({ ...r.toJSON(), supplier_name: names[r.supplier_id] || "" })) });
  } catch (e) { next(e); }
});

router.post("/purchases", async (req, res, next) => {
  try {
    const b = req.body || {};
    const lines = Array.isArray(b.lines) ? b.lines : [];
    if (lines.length === 0) throw new AppError("Add at least one product", 400);
    if (lines.length > 100) throw new AppError("A purchase can have at most 100 lines", 400);
    lines.forEach((l, i) => {
      if (!l || !UUID_RE.test(String(l.item_id || ""))) throw new AppError(`Line ${i + 1}: choose a product`, 400);
      if (!(Number(l.quantity) > 0)) throw new AppError(`Line ${i + 1}: quantity must be more than 0`, 400);
      if (!(Number(l.unit_cost) >= 0) || l.unit_cost === "" || l.unit_cost === null) throw new AppError(`Line ${i + 1}: enter the cost price`, 400);
    });
    if (b.supplier_id && !UUID_RE.test(String(b.supplier_id))) throw new AppError("Supplier not found", 404);

    const purchase = await inTransaction(async (t) => {
      if (b.supplier_id) {
        const sup = await Supplier.findOne({ where: { id: b.supplier_id, venue_id: vid(req) }, transaction: t });
        if (!sup) throw new AppError("Supplier not found", 404);
      }
      const p = await Purchase.create({
        venue_id: vid(req),
        supplier_id: b.supplier_id || null,
        bill_number: String(b.bill_number || "").trim().slice(0, 50) || null,
        bill_date: DATE_RE.test(String(b.bill_date || "")) ? b.bill_date : null,
        notes: b.notes ? String(b.notes).slice(0, 500) : null,
        created_by: req.user?.id || null
      }, { transaction: t });

      const snapshot = [];
      let total = 0;
      const ordered = lines.slice().sort((a, c) => String(a.item_id).localeCompare(String(c.item_id)));
      for (const l of ordered) {
        const qty = Number(l.quantity);
        const cost = Number(l.unit_cost);
        const res2 = await inv.moveStock({
          venueId: vid(req), itemId: l.item_id, variant: l.variant, change: qty, type: "purchase", unitCost: cost,
          refType: "purchase", refId: p.id, note: p.bill_number || "Purchase", userId: req.user?.id, autoTrack: true
        }, t);
        if (!res2) throw new AppError("Product not found", 404);
        const amount = r2(qty * cost);
        total += amount;
        snapshot.push({ item_id: l.item_id, name: res2.item.name, variant: String(l.variant || ""), quantity: qty, unit_cost: cost, amount });
      }
      total = r2(total);
      p.items = snapshot;
      p.total = total;
      p.amount_paid = Math.min(Math.max(r2(b.amount_paid || 0), 0), total);
      await p.save({ transaction: t });
      return p;
    });

    res.status(201).json({ success: true, data: purchase });
  } catch (e) { next(e); }
});

router.post("/purchases/:id/pay", async (req, res, next) => {
  try {
    const p = await inTransaction(async (t) => {
      const row = await Purchase.findOne({ where: { id: req.params.id, venue_id: vid(req) }, transaction: t, lock: t.LOCK.UPDATE });
      if (!row) throw new AppError("Purchase not found", 404);
      if (row.status !== "active") throw new AppError("This purchase is cancelled", 400);
      const amount = r2(req.body?.amount);
      const due = r2(Number(row.total) - Number(row.amount_paid));
      if (!(amount > 0)) throw new AppError("Enter an amount greater than 0", 400);
      if (amount > due + 0.009) throw new AppError(`Amount is more than the balance (Rs. ${due.toFixed(2)})`, 400);
      row.amount_paid = r2(Number(row.amount_paid) + amount);
      await row.save({ transaction: t });
      return row;
    });
    res.json({ success: true, data: p });
  } catch (e) { next(e); }
});

// Cancels a wrongly entered purchase and takes that stock back out.
router.delete("/purchases/:id", async (req, res, next) => {
  try {
    await inTransaction(async (t) => {
      const row = await Purchase.findOne({ where: { id: req.params.id, venue_id: vid(req) }, transaction: t, lock: t.LOCK.UPDATE });
      if (!row) throw new AppError("Purchase not found", 404);
      if (row.status !== "active") throw new AppError("This purchase is already cancelled", 400);
      const ordered = (row.items || []).slice().sort((a, c) => String(a.item_id).localeCompare(String(c.item_id)));
      for (const l of ordered) {
        await inv.moveStock({
          venueId: vid(req), itemId: l.item_id, variant: l.variant, change: -Number(l.quantity), type: "purchase_reversal",
          refType: "purchase", refId: row.id, note: `Cancelled ${row.bill_number || "purchase"}`,
          userId: req.user?.id, allowNegative: true, skipMissing: true
        }, t);
      }
      row.status = "cancelled";
      await row.save({ transaction: t });
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;