const QRCode = require("qrcode");
const { sequelize } = require("../../config/database");
const { FoodTable, FoodUnit, FoodIngredient, FoodStockLog } = require("./food.models");
const { AppError } = require("../../middleware/error.middleware");
const env = require("../../config/env");
const U = require("../gym/gym.utils");
const C = require("./food.constants");
const core = require("./food.core");

const str = (v, max) => String(v ?? "").trim().slice(0, max);
const r3 = (x) => Math.round(Number(x) * 1000) / 1000;
const isUnique = (e) => e && e.name === "SequelizeUniqueConstraintError";

/* ---------------- settings ---------------- */
const BOOLS = ["accepting_orders", "allow_delivery", "allow_pickup", "allow_dine_in", "prices_include_tax"];
const NUMS = {
  min_order: [0, 100000], delivery_fee: [0, 5000], free_delivery_above: [0, 100000], packing_fee: [0, 1000],
  prep_time_min: [5, 240], service_charge_percent: [0, 25], default_tax_rate: [0, 28], aggregator_commission: [0, 50]
};
const TEXTS = { fssai_no: 20, bill_footer: 200, delivery_note: 200 };

function presentSettings(s) {
  const j = s.toJSON();
  Object.keys(NUMS).forEach((k) => { j[k] = Number(j[k]); });
  return j;
}

async function updateSettings(venueId, b) {
  const row = await core.getSettings(venueId);
  const out = {};
  BOOLS.forEach((k) => { if (b[k] !== undefined) out[k] = Boolean(b[k]); });
  Object.entries(NUMS).forEach(([k, [min, max]]) => { if (b[k] !== undefined) out[k] = U.num(b[k], k.replace(/_/g, " "), { min, max }); });
  Object.entries(TEXTS).forEach(([k, max]) => { if (b[k] !== undefined) out[k] = str(b[k], max) || null; });
  if (b.gst_scheme !== undefined) {
    if (!["regular", "composition"].includes(b.gst_scheme)) throw new AppError("Choose regular or composition", 400);
    out.gst_scheme = b.gst_scheme;
  }
  if (out.fssai_no && !/^\d{14}$/.test(out.fssai_no)) throw new AppError("FSSAI number must be 14 digits", 400);
  if (b.message_templates && typeof b.message_templates === "object") {
    const t = {};
    Object.keys(C.DEFAULT_MESSAGES).forEach((k) => { if (b.message_templates[k]) t[k] = str(b.message_templates[k], 500); });
    out.message_templates = t;
  }
  await row.update(out);
  return presentSettings(row);
}

/* ---------------- tables + QR ---------------- */
const listTables = (venueId) => FoodTable.findAll({ where: { venue_id: venueId }, order: [["section", "ASC"], ["name", "ASC"]] });

// { name } adds one table, { count } adds T1..Tn (skips the ones that already exist).
async function createTables(venueId, b) {
  const section = str(b.section, 40) || null;
  const seats = b.seats ? U.num(b.seats, "Seats", { min: 1, max: 50, int: true }) : 4;
  if (b.count) {
    const count = U.num(b.count, "Number of tables", { min: 1, max: 60, int: true });
    const prefix = str(b.prefix, 8) || "T";
    const have = new Set((await listTables(venueId)).map((t) => t.name));
    const rows = [];
    for (let i = 1; i <= count; i++) if (!have.has(`${prefix}${i}`)) rows.push({ venue_id: venueId, name: `${prefix}${i}`, section, seats });
    await FoodTable.bulkCreate(rows);
    return { created: rows.length };
  }
  const name = str(b.name, 30);
  if (!name) throw new AppError("Enter a table name", 400);
  try {
    return await FoodTable.create({ venue_id: venueId, name, section, seats });
  } catch (e) {
    if (isUnique(e)) throw new AppError("A table with this name already exists", 409);
    throw e;
  }
}

async function updateTable(venueId, id, b) {
  const row = await FoodTable.findOne({ where: { id, venue_id: venueId } });
  if (!row) throw new AppError("Table not found", 404);
  const out = {};
  if (b.name !== undefined) out.name = str(b.name, 30);
  if (b.section !== undefined) out.section = str(b.section, 40) || null;
  if (b.seats !== undefined) out.seats = U.num(b.seats, "Seats", { min: 1, max: 50, int: true });
  if (out.name === "") throw new AppError("Enter a table name", 400);
  try {
    await row.update(out);
  } catch (e) {
    if (isUnique(e)) throw new AppError("A table with this name already exists", 409);
    throw e;
  }
  return row;
}

async function deleteTable(venueId, id) {
  const row = await FoodTable.findOne({ where: { id, venue_id: venueId } });
  if (!row) throw new AppError("Table not found", 404);
  await row.destroy();
  return { removed: true };
}

async function tableQr(venue, id, base, res) {
  const t = core.UUID_RE.test(String(id)) ? await FoodTable.findOne({ where: { id, venue_id: venue.id } }) : null;
  if (!t) throw new AppError("Table not found", 404);
  const site = /^https?:\/\/[^\s]+$/.test(String(base || "")) ? String(base).replace(/\/+$/, "") : `https://${venue.subdomain}.${env.baseDomain}`;
  const png = await QRCode.toBuffer(`${site}/?table=${encodeURIComponent(t.name)}`, { width: 600, margin: 2 });
  res.set({ "Content-Type": "image/png", "Content-Disposition": `attachment; filename="table-${t.name.replace(/[^a-z0-9]/gi, "")}.png"` }).send(png);
}

/* ---------------- stalls / outlets ---------------- */
const listUnits = (venueId) => FoodUnit.findAll({ where: { venue_id: venueId, is_active: true }, order: [["name", "ASC"]] });

function cleanUnit(b, kind, partial) {
  const out = {};
  if (!partial || b.name !== undefined) {
    out.name = str(b.name, 100);
    if (out.name.length < 2) throw new AppError("Enter a name", 400);
  }
  if (b.contact_name !== undefined) out.contact_name = str(b.contact_name, 100) || null;
  if (b.phone !== undefined) out.phone = b.phone ? U.normalizePhone(b.phone) : null;
  if (b.share_percent !== undefined) out.share_percent = U.num(b.share_percent, "Share", { min: 0, max: 100 });
  if (!partial) out.kind = kind;
  return out;
}

async function createUnit(venueId, b, sub) {
  if (!sub.unit) throw new AppError("Stalls and outlets are not used by this business", 403);
  return FoodUnit.create({ venue_id: venueId, ...cleanUnit(b, sub.unit.kind, false) });
}

async function updateUnit(venueId, id, b) {
  const row = await FoodUnit.findOne({ where: { id, venue_id: venueId, is_active: true } });
  if (!row) throw new AppError("Not found", 404);
  await row.update(cleanUnit(b, row.kind, true));
  return row;
}

async function removeUnit(venueId, id) {
  const row = await FoodUnit.findOne({ where: { id, venue_id: venueId, is_active: true } });
  if (!row) throw new AppError("Not found", 404);
  await row.update({ is_active: false });
  return { removed: true };
}

/* ---------------- ingredients + stock ---------------- */
async function listIngredients(venueId) {
  const rows = await FoodIngredient.findAll({ where: { venue_id: venueId, is_active: true }, order: [["name", "ASC"]] });
  return rows.map((r) => {
    const j = r.toJSON();
    ["stock_qty", "reorder_level", "cost_per_unit"].forEach((k) => { j[k] = Number(j[k]); });
    j.low = j.reorder_level > 0 && j.stock_qty <= j.reorder_level;
    return j;
  });
}

function cleanIngredient(b, partial) {
  const out = {};
  if (!partial || b.name !== undefined) {
    out.name = str(b.name, 100);
    if (out.name.length < 2) throw new AppError("Enter the ingredient name", 400);
  }
  if (b.unit !== undefined) {
    if (!C.ING_UNITS.includes(b.unit)) throw new AppError("Choose a unit", 400);
    out.unit = b.unit;
  }
  if (b.reorder_level !== undefined) out.reorder_level = U.num(b.reorder_level, "Reorder level", { min: 0, max: 1000000 });
  if (b.cost_per_unit !== undefined) out.cost_per_unit = U.num(b.cost_per_unit, "Cost", { min: 0, max: 1000000 });
  return out;
}

async function createIngredient(venueId, b) {
  const row = await FoodIngredient.create({ venue_id: venueId, ...cleanIngredient(b, false) });
  const opening = b.stock_qty !== undefined && b.stock_qty !== "" ? Number(b.stock_qty) : 0;
  if (opening > 0) await adjustStock(venueId, row.id, { type: "purchase", qty: opening, note: "Opening stock" });
  return row;
}

async function updateIngredient(venueId, id, b) {
  const row = await FoodIngredient.findOne({ where: { id, venue_id: venueId, is_active: true } });
  if (!row) throw new AppError("Ingredient not found", 404);
  await row.update(cleanIngredient(b, true));
  return row;
}

async function removeIngredient(venueId, id) {
  const row = await FoodIngredient.findOne({ where: { id, venue_id: venueId, is_active: true } });
  if (!row) throw new AppError("Ingredient not found", 404);
  await row.update({ is_active: false });
  return { removed: true };
}

// purchase = add, wastage = remove, adjust = "the real count is now ..."
async function adjustStock(venueId, id, b) {
  if (!["purchase", "wastage", "adjust"].includes(b.type)) throw new AppError("Choose purchase, wastage or count", 400);
  const qty = U.num(b.qty, "Quantity", { min: b.type === "adjust" ? 0 : 0.001, max: 1000000 });
  const t = await sequelize.transaction();
  try {
    const row = core.UUID_RE.test(String(id))
      ? await FoodIngredient.findOne({ where: { id, venue_id: venueId, is_active: true }, transaction: t, lock: t.LOCK.UPDATE })
      : null;
    if (!row) throw new AppError("Ingredient not found", 404);
    const current = Number(row.stock_qty);
    const balance = b.type === "purchase" ? r3(current + qty) : b.type === "wastage" ? r3(current - qty) : r3(qty);
    const patch = { stock_qty: balance };
    if (b.type === "purchase" && b.cost_per_unit !== undefined && b.cost_per_unit !== "") patch.cost_per_unit = U.num(b.cost_per_unit, "Cost", { min: 0, max: 1000000 });
    await row.update(patch, { transaction: t });
    await FoodStockLog.create({
      venue_id: venueId, ingredient_id: row.id, type: b.type, qty_change: r3(balance - current),
      balance_after: balance, note: str(b.note, 200) || null
    }, { transaction: t });
    await t.commit();
    return row;
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

module.exports = {
  presentSettings, updateSettings,
  listTables, createTables, updateTable, deleteTable, tableQr,
  listUnits, createUnit, updateUnit, removeUnit,
  listIngredients, createIngredient, updateIngredient, removeIngredient, adjustStock
};