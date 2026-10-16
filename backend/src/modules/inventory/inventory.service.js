const { ServiceItem } = require("../../database/models");
const { getSequelize } = require("../../utils/db");
const { StockMovement } = require("./inventory.models");
const { AppError } = require("../../middleware/error.middleware");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_LOW = 5;
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const variantLabels = (item) =>
  (Array.isArray(item.variants) ? item.variants : []).map((v) => v && v.label).filter(Boolean);

// Item total = sum of its sizes (only sizes that still exist).
function totalFromVariants(item) {
  const vs = item.variant_stock || {};
  return r2(variantLabels(item).reduce((s, l) => s + Number(vs[l] || 0), 0));
}

// Keeps stock_qty equal to the sum of sizes once per-size stock exists. Returns true if it changed anything.
function syncVariantTotal(item) {
  if (variantLabels(item).length && Object.keys(item.variant_stock || {}).length) {
    item.stock_qty = totalFromVariants(item);
    return true;
  }
  return false;
}

function stockStatus(item) {
  if (!item.track_stock) return "untracked";
  const qty = Number(item.stock_qty || 0);
  if (qty <= 0) return "out";
  const th = item.low_stock_threshold !== null && item.low_stock_threshold !== undefined
    ? Number(item.low_stock_threshold)
    : DEFAULT_LOW;
  return qty <= th ? "low" : "ok";
}

/**
 * The ONLY place that changes stock. Must run inside a transaction `t`.
 * o: { venueId, itemId, variant?, change? | setTo?, type, unitCost?, refType?, refId?, note?, userId?,
 *      allowNegative?, autoTrack?, skipMissing? }
 * Returns { item, movement } or null when nothing changed / item is not tracked.
 */
async function moveStock(o, t) {
  const item = await ServiceItem.findOne({
    where: { id: o.itemId, venue_id: o.venueId },
    transaction: t,
    lock: t.LOCK.UPDATE
  });
  if (!item) {
    if (o.skipMissing) return null;
    throw new AppError("Product not found", 404);
  }
  if (item.item_type !== "product") {
    if (o.skipMissing) return null;
    throw new AppError(`${item.name} is a service and has no stock`, 400);
  }
  if (!item.track_stock && !o.autoTrack) return null;

  const labels = variantLabels(item);
  let variant = o.variant ? String(o.variant).trim() : "";
  if (labels.length) {
    if (!variant) throw new AppError(`Choose a size for ${item.name}`, 400);
    if (!labels.includes(variant)) throw new AppError(`${item.name} has no size "${variant}"`, 400);
  } else {
    variant = "";
  }

  const vs = { ...(item.variant_stock || {}) };
  const before = labels.length ? Number(vs[variant] || 0) : Number(item.stock_qty || 0);
  const change = o.setTo !== undefined ? r2(Number(o.setTo) - before) : r2(o.change);
  if (!change) return null;

  const after = r2(before + change);
  if (after < 0 && !o.allowNegative) {
    throw new AppError(`Only ${before} of ${item.name}${variant ? ` (${variant})` : ""} in stock`, 400);
  }

  if (labels.length) {
    vs[variant] = after;
    item.variant_stock = vs;
    item.stock_qty = totalFromVariants(item);
  } else {
    item.stock_qty = after;
  }
  if (!item.track_stock) item.track_stock = true;
  if (o.type === "purchase" && Number(o.unitCost) > 0) item.cost_price = r2(o.unitCost);
  await item.save({ transaction: t });

  const movement = await StockMovement.create({
    venue_id: o.venueId,
    item_id: item.id,
    variant: variant || null,
    type: o.type,
    qty_change: change,
    balance_after: after,
    unit_cost: Number(o.unitCost) > 0 ? r2(o.unitCost) : null,
    ref_type: o.refType || null,
    ref_id: o.refId || null,
    note: o.note ? String(o.note).slice(0, 300) : null,
    created_by: o.userId || null
  }, { transaction: t });

  return { item, movement };
}

// ---- billing link -------------------------------------------------------------------------

// Invoice lines take stock out, credit notes put it back. Quotations and proformas do nothing.
function stockEffects(lines, docType) {
  const sign = docType === "invoice" ? -1 : docType === "credit_note" ? 1 : 0;
  const map = new Map();
  if (!sign) return map;
  (Array.isArray(lines) ? lines : []).forEach((l) => {
    if (!l || !UUID_RE.test(String(l.item_id || ""))) return;
    const q = Number(l.quantity);
    if (!(q > 0)) return;
    const key = `${l.item_id}|${String(l.variant || "").trim()}`;
    map.set(key, r2((map.get(key) || 0) + sign * q));
  });
  return map;
}

/**
 * Applies only the difference between the old and the new version of a document.
 * Create = old [], delete = new [], edit = both. Runs inside the document's transaction.
 */
async function reconcileDocument({ venueId, docType, oldLines, newLines, invoice, userId }, t) {
  const before = stockEffects(oldLines, docType);
  const after = stockEffects(newLines, docType);
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort(); // sorted = same lock order everywhere

  for (const key of keys) {
    const delta = r2((after.get(key) || 0) - (before.get(key) || 0));
    if (!delta) continue;
    const [itemId, variant] = key.split("|");
    const isReturn = docType === "credit_note";
    const type = isReturn ? (delta > 0 ? "return" : "return_reversal") : delta < 0 ? "sale" : "sale_reversal";
    await moveStock({
      venueId, itemId, variant, change: delta, type,
      refType: "invoice", refId: invoice.id, note: invoice.invoice_number,
      userId, allowNegative: true, skipMissing: true
    }, t);
  }
}

// ---- manual adjustment ---------------------------------------------------------------------

const REASONS = ["recount", "found", "damaged", "lost", "returned_to_supplier", "other"];

async function adjust(venueId, itemId, body, userId) {
  const mode = ["add", "remove", "set"].includes(body.mode) ? body.mode : null;
  if (!mode) throw new AppError("Choose add, remove or set", 400);
  const qty = Number(body.qty);
  if (!(qty >= 0) || (mode !== "set" && !(qty > 0))) throw new AppError("Enter a valid quantity", 400);
  const reason = REASONS.includes(body.reason) ? body.reason : "other";
  const note = [reason.replace(/_/g, " "), body.note ? String(body.note).slice(0, 200) : ""].filter(Boolean).join(": ");

  const t = await getSequelize().transaction();
  try {
    const base = { venueId, itemId, variant: body.variant, type: "adjustment", note, userId, autoTrack: true };
    const res = await moveStock(
      mode === "set" ? { ...base, setTo: qty } : { ...base, change: mode === "add" ? qty : -qty },
      t
    );
    await t.commit();
    return res ? res.item : await ServiceItem.findByPk(itemId);
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

// ---- dashboard numbers ---------------------------------------------------------------------

async function overview(venueId) {
  const rows = await ServiceItem.findAll({
    where: { venue_id: venueId, item_type: "product" },
    attributes: ["id", "name", "default_price", "cost_price", "track_stock", "stock_qty", "low_stock_threshold", "is_active"],
    limit: 5000
  });
  const o = { total_products: rows.length, tracked_products: 0, stock_units: 0, cost_value: 0, retail_value: 0, low_count: 0, out_count: 0, low_items: [] };
  rows.forEach((r) => {
    const status = stockStatus(r);
    if (status === "untracked") return;
    o.tracked_products += 1;
    const qty = Math.max(Number(r.stock_qty || 0), 0);
    o.stock_units += qty;
    o.cost_value += qty * Number(r.cost_price || 0);
    o.retail_value += qty * Number(r.default_price || 0);
    if (status === "low") o.low_count += 1;
    if (status === "out") o.out_count += 1;
    if (status === "low" || status === "out") o.low_items.push({ id: r.id, name: r.name, stock_qty: Number(r.stock_qty || 0), status });
  });
  o.stock_units = r2(o.stock_units);
  o.cost_value = r2(o.cost_value);
  o.retail_value = r2(o.retail_value);
  o.low_items = o.low_items.sort((a, b) => a.stock_qty - b.stock_qty).slice(0, 8);
  return o;
}

module.exports = {
  UUID_RE, DEFAULT_LOW, r2, variantLabels, syncVariantTotal, stockStatus,
  moveStock, reconcileDocument, adjust, overview
};