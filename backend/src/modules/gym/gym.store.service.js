const { Op } = require("sequelize");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const C = require("./gym.constants");
const core = require("./gym.core");
const {
  sequelize, GymStoreSettings, GymStoreCategory, GymProduct, GymProductVariant, GymStockMovement, GymSale
} = require("./gym.store.models");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_CATEGORIES = ["Protein", "Mass Gainer", "Creatine", "Pre-Workout", "BCAA & EAA", "Tablets & Vitamins", "Fat Burners", "Bars & Drinks", "Accessories"];
const SALE_MODES = C.PAYMENT_MODES.filter((m) => m !== "razorpay");
const STOCK_REASONS = {
  purchase: "Purchase / stock in", return: "Customer return", recount: "Recount", damaged: "Damaged",
  expired: "Expired", lost: "Lost / missing", own_use: "Own use / sample", other: "Other"
};

const r2 = U.money;
const str = (v, n) => String(v ?? "").trim().slice(0, n);
const blank = (v) => v === undefined || v === null || v === "";
const uniqueOr = (msg) => (e) => {
  if (e && e.name === "SequelizeUniqueConstraintError") throw new AppError(msg, 400);
  throw e;
};

/* ---------- settings and categories ---------- */
async function getSettings(venueId) {
  const [s] = await GymStoreSettings.findOrCreate({ where: { venue_id: venueId } });
  if (s.categories_seeded) return s;
  // First visit: give the gym the usual supplement categories (once, race-safe).
  await sequelize.transaction(async (t) => {
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:k))", { replacements: { k: `gym_store_seed:${venueId}` }, transaction: t });
    const fresh = await GymStoreSettings.findOne({ where: { venue_id: venueId }, transaction: t, lock: t.LOCK.UPDATE });
    if (fresh.categories_seeded) return;
    if (!(await GymStoreCategory.count({ where: { venue_id: venueId }, transaction: t }))) {
      await GymStoreCategory.bulkCreate(DEFAULT_CATEGORIES.map((name, i) => ({ venue_id: venueId, name, sort_order: i })), { transaction: t });
    }
    await fresh.update({ categories_seeded: true }, { transaction: t });
  });
  return s.reload();
}

// Puts the "Supplements" section on the gym website (before the gallery) if it is not there yet.
async function ensureWebsiteSection(venue) {
  try {
    const { normalizeSections, makeSection } = require("../../utils/pageSections");
    const sections = normalizeSections(venue);
    if (sections.some((s) => s.type === "supplements")) return;
    const at = sections.findIndex((s) => s.type === "gallery");
    sections.splice(at >= 0 ? at : sections.length, 0, makeSection("supplements", "gym-fitness"));
    await venue.update({ page_sections: sections });
  } catch (e) {
    console.error("[GYM STORE] could not add the website section:", e.message);
  }
}

async function updateSettings(venue, b) {
  const s = await getSettings(venue.id);
  const up = {};
  if (b.show_on_website !== undefined) up.show_on_website = !!b.show_on_website;
  if (b.show_out_of_stock !== undefined) up.show_out_of_stock = !!b.show_out_of_stock;
  if (b.tagline !== undefined) up.tagline = str(b.tagline, 160) || null;
  if (b.invoice_terms !== undefined) up.invoice_terms = str(b.invoice_terms, 500) || null;
  if (b.low_stock_default !== undefined) up.low_stock_default = U.num(b.low_stock_default, "Low stock alert", { max: 1000, int: true });
  if (b.invoice_prefix !== undefined) {
    const p = String(b.invoice_prefix).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
    if (!p) throw new AppError("Bill number prefix is invalid", 400);
    up.invoice_prefix = p;
  }
  await s.update(up);
  if (up.show_on_website) await ensureWebsiteSection(venue);
  return s;
}

async function listCategories(venueId) {
  await getSettings(venueId);
  const [cats, products] = await Promise.all([
    GymStoreCategory.findAll({ where: { venue_id: venueId }, order: [["sort_order", "ASC"], ["name", "ASC"]] }),
    GymProduct.findAll({ where: { venue_id: venueId, is_archived: false }, attributes: ["category_id"] })
  ]);
  const count = new Map();
  products.forEach((p) => count.set(p.category_id, (count.get(p.category_id) || 0) + 1));
  return cats.map((c) => ({ ...c.toJSON(), product_count: count.get(c.id) || 0 }));
}

async function createCategory(venueId, b) {
  const name = str(b.name, 60);
  if (name.length < 2) throw new AppError("Enter a category name", 400);
  if (await GymStoreCategory.findOne({ where: { venue_id: venueId, name: { [Op.iLike]: U.likeEscape(name) } } })) {
    throw new AppError("This category already exists", 400);
  }
  const last = await GymStoreCategory.max("sort_order", { where: { venue_id: venueId } });
  return GymStoreCategory.create({ venue_id: venueId, name, sort_order: (Number(last) || 0) + 1 });
}

async function ownCategory(venueId, id) {
  const c = UUID_RE.test(String(id)) ? await GymStoreCategory.findOne({ where: { id, venue_id: venueId } }) : null;
  if (!c) throw new AppError("Category not found", 404);
  return c;
}

async function updateCategory(venueId, id, b) {
  const c = await ownCategory(venueId, id);
  const up = {};
  if (b.name !== undefined) {
    const name = str(b.name, 60);
    if (name.length < 2) throw new AppError("Enter a category name", 400);
    const dup = await GymStoreCategory.findOne({ where: { venue_id: venueId, id: { [Op.ne]: id }, name: { [Op.iLike]: U.likeEscape(name) } } });
    if (dup) throw new AppError("This category already exists", 400);
    up.name = name;
  }
  if (b.is_active !== undefined) up.is_active = !!b.is_active;
  if (b.sort_order !== undefined) up.sort_order = U.num(b.sort_order || 0, "Order", { max: 1000, int: true });
  return c.update(up);
}

async function deleteCategory(venueId, id) {
  const c = await ownCategory(venueId, id);
  if (await GymProduct.count({ where: { category_id: id, is_archived: false } })) {
    throw new AppError("Move or delete the products in this category first", 400);
  }
  await c.destroy();
  return { deleted: true };
}

/* ---------- presenting products ---------- */
const lowLimit = (v, s) => (v.low_stock_threshold != null ? Number(v.low_stock_threshold) : s.low_stock_default);

function stockStatus(v, s) {
  const q = Number(v.stock_qty);
  return q <= 0 ? "out" : q <= lowLimit(v, s) ? "low" : "ok";
}

function expiryState(v, today) {
  if (!v.expiry_date || Number(v.stock_qty) <= 0) return null;
  if (v.expiry_date < today) return "expired";
  return U.diffDays(today, v.expiry_date) <= 60 ? "soon" : null;
}

function presentVariant(v, s, today) {
  return {
    id: v.id, label: v.label, sku: v.sku, barcode: v.barcode,
    mrp: v.mrp != null ? Number(v.mrp) : null, price: Number(v.price), cost_price: Number(v.cost_price),
    stock_qty: Number(v.stock_qty), low_stock_threshold: v.low_stock_threshold, expiry_date: v.expiry_date,
    expiry_state: expiryState(v, today), is_active: v.is_active, sort_order: v.sort_order, stock_status: stockStatus(v, s)
  };
}

function presentProduct(p, variants, catName, s, today) {
  const vs = variants.map((v) => presentVariant(v, s, today));
  const live = vs.filter((v) => v.is_active);
  const prices = live.map((v) => v.price);
  return {
    ...p.toJSON(), tax_rate: Number(p.tax_rate), category_name: catName || null, variants: vs,
    total_stock: live.reduce((n, v) => n + v.stock_qty, 0),
    min_price: prices.length ? Math.min(...prices) : null,
    stock_status: !live.length || live.every((v) => v.stock_status === "out") ? "out" : live.some((v) => v.stock_status !== "ok") ? "low" : "ok",
    expiry_alert: live.some((v) => v.expiry_state) ? (live.some((v) => v.expiry_state === "expired") ? "expired" : "soon") : null
  };
}

async function variantMap(venueId, productIds) {
  const rows = productIds.length
    ? await GymProductVariant.findAll({ where: { venue_id: venueId, product_id: productIds }, order: [["sort_order", "ASC"], ["label", "ASC"]] })
    : [];
  const map = new Map();
  rows.forEach((v) => { if (!map.has(v.product_id)) map.set(v.product_id, []); map.get(v.product_id).push(v); });
  return map;
}

async function categoryNames(venueId) {
  const cats = await GymStoreCategory.findAll({ where: { venue_id: venueId } });
  return new Map(cats.map((c) => [c.id, c.name]));
}

async function listProducts(venueId, q) {
  const s = await getSettings(venueId);
  const today = U.todayIST();
  const where = { venue_id: venueId, is_archived: false };
  if (UUID_RE.test(String(q.category_id))) where.category_id = q.category_id;
  const needle = String(q.q || "").trim();
  if (needle) {
    const like = `%${U.likeEscape(needle)}%`;
    const hits = await GymProductVariant.findAll({
      where: { venue_id: venueId, [Op.or]: [{ sku: { [Op.iLike]: like } }, { barcode: { [Op.iLike]: like } }] }, attributes: ["product_id"], limit: 200
    });
    where[Op.or] = [{ name: { [Op.iLike]: like } }, { brand: { [Op.iLike]: like } }, { id: { [Op.in]: hits.map((h) => h.product_id) } }];
  }
  const [products, names] = await Promise.all([
    GymProduct.findAll({ where, order: [["is_featured", "DESC"], ["sort_order", "ASC"], ["name", "ASC"]], limit: 2000 }),
    categoryNames(venueId)
  ]);
  const vars = await variantMap(venueId, products.map((p) => p.id));
  let items = products.map((p) => presentProduct(p, vars.get(p.id) || [], names.get(p.category_id), s, today));

  const status = String(q.status || "all");
  if (status === "active") items = items.filter((p) => p.is_active);
  else if (status === "inactive") items = items.filter((p) => !p.is_active);
  else if (status === "low") items = items.filter((p) => p.is_active && p.stock_status === "low");
  else if (status === "out") items = items.filter((p) => p.is_active && p.stock_status === "out");
  else if (status === "expiring") items = items.filter((p) => p.expiry_alert);

  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 25, 1), 100);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  return { items: items.slice((page - 1) * limit, page * limit), total: items.length, page, pages: Math.max(Math.ceil(items.length / limit), 1) };
}

async function getProduct(venueId, id) {
  const p = UUID_RE.test(String(id)) ? await GymProduct.findOne({ where: { id, venue_id: venueId, is_archived: false } }) : null;
  if (!p) throw new AppError("Product not found", 404);
  const [s, names, vars] = await Promise.all([getSettings(venueId), categoryNames(venueId), variantMap(venueId, [p.id])]);
  return presentProduct(p, vars.get(p.id) || [], names.get(p.category_id), s, U.todayIST());
}

/* ---------- creating and editing products ---------- */
function productFields(b, creating) {
  const o = {};
  if (creating || b.name !== undefined) {
    const n = str(b.name, 150);
    if (!n) throw new AppError("Product name is required", 400);
    o.name = n;
  }
  if (b.brand !== undefined) o.brand = str(b.brand, 80) || null;
  if (b.description !== undefined) o.description = str(b.description, 2000) || null;
  if (b.highlights !== undefined) o.highlights = (Array.isArray(b.highlights) ? b.highlights : []).map((h) => str(h, 100)).filter(Boolean).slice(0, 8);
  if (b.image_url !== undefined) o.image_url = str(b.image_url, 500) || null;
  if (b.gallery !== undefined) o.gallery = (Array.isArray(b.gallery) ? b.gallery : []).map((u) => str(u, 500)).filter(Boolean).slice(0, 5);
  if (b.offer_label !== undefined) o.offer_label = str(b.offer_label, 40) || null;
  if (b.offer_ends_on !== undefined) o.offer_ends_on = b.offer_ends_on && U.isYmd(b.offer_ends_on) ? b.offer_ends_on : null;
  ["is_featured", "is_active", "show_on_website"].forEach((k) => { if (b[k] !== undefined) o[k] = !!b[k]; });
  if (b.tax_rate !== undefined) o.tax_rate = U.num(b.tax_rate || 0, "GST rate", { max: 28 });
  if (b.hsn !== undefined) o.hsn = str(b.hsn, 12) || null;
  if (b.sort_order !== undefined) o.sort_order = U.num(b.sort_order || 0, "Order", { max: 100000, int: true });
  return o;
}

function variantFields(v, creating) {
  const o = {};
  if (creating || v.label !== undefined) {
    const l = str(v.label, 80);
    if (!l) throw new AppError("Every option needs a name, for example 1 kg Chocolate", 400);
    o.label = l;
  }
  if (v.sku !== undefined) o.sku = str(v.sku, 40) || null;
  if (v.barcode !== undefined) o.barcode = str(v.barcode, 40) || null;
  if (creating || v.price !== undefined) o.price = U.num(v.price, "Selling price", { max: 1000000 });
  if (v.mrp !== undefined) o.mrp = blank(v.mrp) ? null : U.num(v.mrp, "MRP", { max: 1000000 });
  if (v.cost_price !== undefined) o.cost_price = blank(v.cost_price) ? 0 : U.num(v.cost_price, "Cost price", { max: 1000000 });
  if (v.low_stock_threshold !== undefined) o.low_stock_threshold = blank(v.low_stock_threshold) ? null : U.num(v.low_stock_threshold, "Low stock alert", { max: 100000, int: true });
  if (v.expiry_date !== undefined) o.expiry_date = v.expiry_date && U.isYmd(v.expiry_date) ? v.expiry_date : null;
  if (v.is_active !== undefined) o.is_active = !!v.is_active;
  if (v.sort_order !== undefined) o.sort_order = U.num(v.sort_order || 0, "Order", { max: 1000, int: true });
  return o;
}

const checkMrp = (price, mrp, label) => {
  if (mrp != null && Number(mrp) < Number(price)) throw new AppError(`MRP of ${label} cannot be lower than the selling price`, 400);
};
const openingQty = (v) => (blank(v.stock_qty) ? 0 : U.num(v.stock_qty, "Opening stock", { max: 1000000, int: true }));

async function categoryId(venueId, id) {
  if (blank(id)) return null;
  return (await ownCategory(venueId, id)).id;
}

async function addVariant(t, { venue, user }, productId, v, sortOrder) {
  const f = variantFields(v, true);
  checkMrp(f.price, f.mrp, f.label);
  const qty = openingQty(v);
  const row = await GymProductVariant.create({ ...f, stock_qty: qty, venue_id: venue.id, product_id: productId, sort_order: v.sort_order !== undefined ? f.sort_order : sortOrder }, { transaction: t });
  if (qty > 0) {
    await GymStockMovement.create({
      venue_id: venue.id, product_id: productId, variant_id: row.id, type: "opening", qty_change: qty, balance_after: qty,
      unit_cost: Number(row.cost_price) > 0 ? row.cost_price : null, note: "Opening stock", created_by_name: user && user.name
    }, { transaction: t });
  }
  return row;
}

async function createProduct(ctx, b) {
  const { venue } = ctx;
  const settings = await getSettings(venue.id);
  const fields = productFields(b, true);
  const catId = await categoryId(venue.id, b.category_id);
  const vars = Array.isArray(b.variants) ? b.variants : [];
  if (vars.length < 1 || vars.length > 30) throw new AppError("Add between 1 and 30 options (size / flavour) with a price", 400);

  const product = await sequelize.transaction(async (t) => {
    const p = await GymProduct.create({ ...fields, category_id: catId, venue_id: venue.id }, { transaction: t });
    for (const [i, v] of vars.entries()) await addVariant(t, ctx, p.id, v, i);
    return p;
  }).catch(uniqueOr("That SKU is already used by another product"));

  const total = await GymProduct.count({ where: { venue_id: venue.id, is_archived: false } });
  if (total === 1 && settings.show_on_website && product.show_on_website) await ensureWebsiteSection(venue);
  return getProduct(venue.id, product.id);
}

async function updateProduct(ctx, id, b) {
  const { venue } = ctx;
  const fields = productFields(b, false);
  if (b.category_id !== undefined) fields.category_id = await categoryId(venue.id, b.category_id);

  await sequelize.transaction(async (t) => {
    const p = UUID_RE.test(String(id))
      ? await GymProduct.findOne({ where: { id, venue_id: venue.id, is_archived: false }, transaction: t, lock: t.LOCK.UPDATE })
      : null;
    if (!p) throw new AppError("Product not found", 404);
    if (Object.keys(fields).length) await p.update(fields, { transaction: t });

    const vars = Array.isArray(b.variants) ? b.variants : [];
    for (const [i, v] of vars.entries()) {
      if (!v || !v.id) { await addVariant(t, ctx, p.id, v || {}, 100 + i); continue; }
      const row = await GymProductVariant.findOne({ where: { id: v.id, product_id: p.id, venue_id: venue.id }, transaction: t, lock: t.LOCK.UPDATE });
      if (!row) throw new AppError("Option not found", 404);
      const f = variantFields(v, false); // stock is never edited here, use Add / remove stock
      checkMrp(f.price !== undefined ? f.price : row.price, f.mrp !== undefined ? f.mrp : row.mrp, f.label || row.label);
      if (Object.keys(f).length) await row.update(f, { transaction: t });
    }
    if (vars.length && !(await GymProductVariant.count({ where: { product_id: p.id, is_active: true }, transaction: t }))) {
      throw new AppError("Keep at least one active option", 400);
    }
  }).catch(uniqueOr("That SKU is already used by another product"));

  return getProduct(venue.id, id);
}

// Never loses history: a product that was ever sold or restocked is archived, a fresh one is removed.
async function deleteProduct(venueId, id) {
  const p = UUID_RE.test(String(id)) ? await GymProduct.findOne({ where: { id, venue_id: venueId, is_archived: false } }) : null;
  if (!p) throw new AppError("Product not found", 404);
  const used = await GymStockMovement.count({ where: { product_id: id, type: { [Op.ne]: "opening" } } });
  await sequelize.transaction(async (t) => {
    if (used) {
      await p.update({ is_archived: true, is_active: false }, { transaction: t });
      await GymProductVariant.update({ is_active: false }, { where: { product_id: id }, transaction: t });
    } else {
      await GymStockMovement.destroy({ where: { product_id: id }, transaction: t });
      await GymProductVariant.destroy({ where: { product_id: id }, transaction: t });
      await p.destroy({ transaction: t });
    }
  });
  return used ? { archived: true } : { deleted: true };
}

/* ---------- stock ---------- */
async function adjustStock({ venue, user }, variantId, b) {
  const mode = ["add", "remove", "set"].includes(b.mode) ? b.mode : null;
  if (!mode) throw new AppError("Choose add, remove or set", 400);
  const qty = U.num(b.qty, "Quantity", { max: 1000000, int: true });
  if (mode !== "set" && qty < 1) throw new AppError("Enter a quantity", 400);
  const reason = STOCK_REASONS[b.reason] ? b.reason : mode === "add" ? "purchase" : "other";
  const cost = blank(b.unit_cost) ? 0 : U.num(b.unit_cost, "Cost price", { max: 1000000 });
  const settings = await getSettings(venue.id);

  const v = await sequelize.transaction(async (t) => {
    const row = UUID_RE.test(String(variantId))
      ? await GymProductVariant.findOne({ where: { id: variantId, venue_id: venue.id }, transaction: t, lock: t.LOCK.UPDATE })
      : null;
    if (!row) throw new AppError("Product option not found", 404);
    const before = Number(row.stock_qty);
    const after = mode === "add" ? before + qty : mode === "remove" ? before - qty : qty;
    if (after < 0) throw new AppError(`Only ${before} in stock`, 400);
    if (after === before) return row;

    const patch = { stock_qty: after };
    if (mode === "add" && reason === "purchase" && cost > 0) patch.cost_price = cost;
    if (mode === "add" && b.expiry_date && U.isYmd(b.expiry_date)) {
      // keep the sooner date when old stock is still on the shelf
      patch.expiry_date = before > 0 && row.expiry_date && row.expiry_date < b.expiry_date ? row.expiry_date : b.expiry_date;
    }
    await row.update(patch, { transaction: t });
    await GymStockMovement.create({
      venue_id: venue.id, product_id: row.product_id, variant_id: row.id,
      type: mode === "add" && reason === "purchase" ? "purchase" : mode === "add" && reason === "return" ? "return" : "adjustment",
      qty_change: after - before, balance_after: after, unit_cost: cost > 0 ? cost : null,
      note: [STOCK_REASONS[reason], str(b.note, 200)].filter(Boolean).join(": "), created_by_name: user && user.name
    }, { transaction: t });
    return row;
  });
  return presentVariant(v, settings, U.todayIST());
}

async function listMovements(venueId, variantId) {
  if (!UUID_RE.test(String(variantId))) throw new AppError("Product option not found", 404);
  return GymStockMovement.findAll({ where: { venue_id: venueId, variant_id: variantId }, order: [["createdAt", "DESC"]], limit: 50 });
}

/* ---------- counter billing ---------- */
async function posSearch(venueId, q) {
  const needle = String(q.q || "").trim();
  if (!needle) return [];
  const like = `%${U.likeEscape(needle)}%`;
  const products = await GymProduct.findAll({
    where: { venue_id: venueId, is_archived: false, is_active: true, [Op.or]: [{ name: { [Op.iLike]: like } }, { brand: { [Op.iLike]: like } }] },
    limit: 40
  });
  const variants = await GymProductVariant.findAll({
    where: {
      venue_id: venueId, is_active: true,
      [Op.or]: [{ product_id: { [Op.in]: products.map((p) => p.id) } }, { sku: { [Op.iLike]: like } }, { barcode: { [Op.iLike]: like } }]
    },
    order: [["label", "ASC"]], limit: 60
  });
  const need = [...new Set(variants.map((v) => v.product_id))].filter((id) => !products.some((p) => p.id === id));
  const extra = need.length ? await GymProduct.findAll({ where: { id: need, venue_id: venueId, is_archived: false, is_active: true } }) : [];
  const pMap = new Map([...products, ...extra].map((p) => [p.id, p]));
  const exact = needle.toLowerCase();
  return variants
    .filter((v) => pMap.has(v.product_id))
    .map((v) => {
      const p = pMap.get(v.product_id);
      return {
        variant_id: v.id, product_id: p.id, name: p.name, brand: p.brand, label: v.label, sku: v.sku, price: Number(v.price),
        mrp: v.mrp != null ? Number(v.mrp) : null, stock_qty: Number(v.stock_qty), tax_rate: Number(p.tax_rate), image_url: p.image_url,
        exact: [v.sku, v.barcode].some((x) => x && String(x).toLowerCase() === exact)
      };
    })
    .sort((a, b) => Number(b.exact) - Number(a.exact))
    .slice(0, 30);
}

async function nextSaleSeq(t, venueId) {
  await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:k))", { replacements: { k: `gym_sales:${venueId}` }, transaction: t });
  const [[row]] = await sequelize.query("SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM gym_sales WHERE venue_id = :v", { replacements: { v: venueId }, transaction: t });
  return Number(row.n);
}

function presentSale(s) {
  const j = s.toJSON();
  ["subtotal", "line_discount", "discount", "total", "tax_amount", "cost_total", "amount_paid"].forEach((k) => { j[k] = Number(j[k]); });
  j.balance = r2(j.total - j.amount_paid);
  return j;
}

async function createSale(ctx, b) {
  const { venue, user } = ctx;
  const settings = await getSettings(venue.id);
  const raw = Array.isArray(b.items) ? b.items : [];
  if (!raw.length || raw.length > 50) throw new AppError("Add between 1 and 50 products to the bill", 400);
  const lines = raw.map((r) => {
    if (!r || !UUID_RE.test(String(r.variant_id))) throw new AppError("Invalid product in the bill", 400);
    return {
      variant_id: r.variant_id, qty: U.num(r.qty, "Quantity", { min: 1, max: 10000, int: true }),
      line_discount: blank(r.line_discount) ? 0 : U.num(r.line_discount, "Discount", { max: 10000000 })
    };
  });

  const member = b.member_id ? await core.findMember(venue.id, b.member_id) : null;
  const customerName = member ? member.name : str(b.customer_name, 100) || "Walk-in customer";
  const customerPhone = member ? member.phone : str(b.customer_phone, 20) ? U.normalizePhone(b.customer_phone) : null;
  const extra = blank(b.discount) ? 0 : U.num(b.discount, "Discount", { max: 10000000 });
  const mode = SALE_MODES.includes(b.pay_mode) ? b.pay_mode : "cash";
  const today = U.todayIST();
  const soldOn = b.sold_on && U.isYmd(b.sold_on) && U.diffDays(today, b.sold_on) <= 0 && U.diffDays(today, b.sold_on) >= -31 ? b.sold_on : today;

  const sale = await sequelize.transaction(async (t) => {
    const ids = [...new Set(lines.map((l) => l.variant_id))].sort();
    const variants = await GymProductVariant.findAll({ where: { id: ids, venue_id: venue.id }, order: [["id", "ASC"]], transaction: t, lock: t.LOCK.UPDATE });
    const vMap = new Map(variants.map((v) => [v.id, v]));
    const products = await GymProduct.findAll({ where: { id: [...new Set(variants.map((v) => v.product_id))], venue_id: venue.id }, transaction: t });
    const pMap = new Map(products.map((p) => [p.id, p]));

    const need = new Map();
    const items = lines.map((l) => {
      const v = vMap.get(l.variant_id);
      const p = v && pMap.get(v.product_id);
      if (!v || !p || !v.is_active || p.is_archived) throw new AppError("A product in the bill is no longer available", 400);
      need.set(v.id, (need.get(v.id) || 0) + l.qty);
      const price = Number(v.price);
      const gross = r2(price * l.qty);
      if (l.line_discount > gross) throw new AppError(`Discount on ${p.name} is more than its price`, 400);
      return {
        product_id: p.id, variant_id: v.id, name: p.name, brand: p.brand || "", variant_label: v.label, sku: v.sku || "", hsn: p.hsn || "",
        qty: l.qty, mrp: v.mrp != null ? Number(v.mrp) : price, price, line_discount: l.line_discount, amount: r2(gross - l.line_discount),
        tax_rate: Number(p.tax_rate), cost: Number(v.cost_price)
      };
    });
    for (const [id, qty] of need) {
      const v = vMap.get(id);
      if (Number(v.stock_qty) < qty) throw new AppError(`Only ${v.stock_qty} of ${pMap.get(v.product_id).name} (${v.label}) in stock`, 400);
      if (expiryState(v, today) === "expired") throw new AppError(`${pMap.get(v.product_id).name} (${v.label}) is past its expiry date. Remove the expired stock first`, 400);
    }

    const linesTotal = r2(items.reduce((n, l) => n + l.amount, 0));
    if (extra > linesTotal) throw new AppError("Discount is more than the bill total", 400);
    const total = r2(linesTotal - extra);
    const factor = linesTotal > 0 ? total / linesTotal : 0;
    const tax = r2(items.reduce((n, l) => n + (l.amount * factor * l.tax_rate) / (100 + l.tax_rate), 0));
    const paid = blank(b.pay_amount) ? total : U.num(b.pay_amount, "Amount received", { max: total });
    if (paid < total - 0.009 && !member && !customerPhone && customerName === "Walk-in customer") {
      throw new AppError("Add the customer's name or phone for a bill with dues", 400);
    }

    const seq = await nextSaleSeq(t, venue.id);
    const row = await GymSale.create({
      venue_id: venue.id, seq, invoice_no: `${settings.invoice_prefix}-${String(seq).padStart(5, "0")}`,
      member_id: member ? member.id : null, customer_name: customerName, customer_phone: customerPhone, items,
      subtotal: r2(items.reduce((n, l) => n + l.price * l.qty, 0)), line_discount: r2(items.reduce((n, l) => n + l.line_discount, 0)),
      discount: extra, total, tax_amount: tax, cost_total: r2(items.reduce((n, l) => n + l.cost * l.qty, 0)), amount_paid: paid,
      status: paid >= total - 0.009 ? "paid" : paid > 0 ? "partial" : "due",
      payments: paid > 0 ? [{ id: U.token().slice(0, 8), amount: paid, mode, paid_on: soldOn, reference: str(b.reference, 80), received_by: user && user.name }] : [],
      sold_on: soldOn, notes: str(b.notes, 300) || null, share_token: U.token(), created_by_name: user && user.name
    }, { transaction: t });

    for (const [id, qty] of need) {
      const v = vMap.get(id);
      const after = Number(v.stock_qty) - qty;
      await v.update({ stock_qty: after }, { transaction: t });
      await GymStockMovement.create({
        venue_id: venue.id, product_id: v.product_id, variant_id: v.id, type: "sale", qty_change: -qty, balance_after: after,
        ref_id: row.id, note: row.invoice_no, created_by_name: user && user.name
      }, { transaction: t });
    }
    return row;
  });
  return presentSale(sale);
}

async function lockSale(venueId, id, t) {
  const s = UUID_RE.test(String(id)) ? await GymSale.findOne({ where: { id, venue_id: venueId }, transaction: t, lock: t.LOCK.UPDATE }) : null;
  if (!s) throw new AppError("Bill not found", 404);
  return s;
}

async function getSale(venueId, id) {
  const s = UUID_RE.test(String(id)) ? await GymSale.findOne({ where: { id, venue_id: venueId } }) : null;
  if (!s) throw new AppError("Bill not found", 404);
  return presentSale(s);
}

async function listSales(venueId, q) {
  const where = { venue_id: venueId };
  if (q.status === "dues") where.status = { [Op.in]: ["partial", "due"] };
  else if (["paid", "partial", "due", "cancelled"].includes(q.status)) where.status = q.status;
  if (q.from && U.isYmd(q.from)) where.sold_on = { ...(where.sold_on || {}), [Op.gte]: q.from };
  if (q.to && U.isYmd(q.to)) where.sold_on = { ...(where.sold_on || {}), [Op.lte]: q.to };
  const needle = String(q.q || "").trim();
  if (needle) {
    const like = `%${U.likeEscape(needle)}%`;
    where[Op.or] = [{ invoice_no: { [Op.iLike]: like } }, { customer_name: { [Op.iLike]: like } }, { customer_phone: { [Op.iLike]: like } }];
  }
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 25, 1), 100);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const { rows, count } = await GymSale.findAndCountAll({ where, order: [["seq", "DESC"]], limit, offset: (page - 1) * limit });

  const live = await GymSale.findAll({ where: { ...where, status: { [Op.in]: ["paid", "partial", "due"] } }, attributes: ["total", "amount_paid"] });
  const total = r2(live.reduce((n, s) => n + Number(s.total), 0));
  const paid = r2(live.reduce((n, s) => n + Number(s.amount_paid), 0));
  return {
    items: rows.map(presentSale), total: count, page, pages: Math.max(Math.ceil(count / limit), 1),
    summary: { bills: live.length, total, paid, due: r2(total - paid) }
  };
}

async function addPayment({ venue, user }, id, b) {
  const sale = await sequelize.transaction(async (t) => {
    const s = await lockSale(venue.id, id, t);
    if (s.status === "cancelled") throw new AppError("This bill is cancelled", 400);
    const balance = r2(Number(s.total) - Number(s.amount_paid));
    if (balance <= 0.009) throw new AppError("This bill is already fully paid", 400);
    const amount = U.num(b.amount, "Amount", { min: 0.01, max: balance });
    const paid = r2(Number(s.amount_paid) + amount);
    await s.update({
      amount_paid: paid, status: paid >= Number(s.total) - 0.009 ? "paid" : "partial",
      payments: [...(s.payments || []), {
        id: U.token().slice(0, 8), amount, mode: SALE_MODES.includes(b.mode) ? b.mode : "cash", paid_on: U.todayIST(),
        reference: str(b.reference, 80), received_by: user && user.name
      }]
    }, { transaction: t });
    return s;
  });
  return presentSale(sale);
}

// Puts the stock back. The money is NOT refunded automatically: the owner settles that with the customer.
async function cancelSale({ venue, user }, id, b) {
  const sale = await sequelize.transaction(async (t) => {
    const s = await lockSale(venue.id, id, t);
    if (s.status === "cancelled") throw new AppError("This bill is already cancelled", 400);
    const back = new Map();
    (s.items || []).forEach((l) => back.set(l.variant_id, (back.get(l.variant_id) || 0) + Number(l.qty)));
    const variants = await GymProductVariant.findAll({ where: { id: [...back.keys()], venue_id: venue.id }, order: [["id", "ASC"]], transaction: t, lock: t.LOCK.UPDATE });
    for (const v of variants) {
      const after = Number(v.stock_qty) + back.get(v.id);
      await v.update({ stock_qty: after }, { transaction: t });
      await GymStockMovement.create({
        venue_id: venue.id, product_id: v.product_id, variant_id: v.id, type: "sale_reversal", qty_change: back.get(v.id), balance_after: after,
        ref_id: s.id, note: `Cancelled ${s.invoice_no}`, created_by_name: user && user.name
      }, { transaction: t });
    }
    await s.update({ status: "cancelled", cancelled_at: new Date(), cancel_reason: str(b.reason, 200) || null }, { transaction: t });
    return s;
  });
  return presentSale(sale);
}

/* ---------- overview numbers ---------- */
async function overview(venueId) {
  const s = await getSettings(venueId);
  const today = U.todayIST();
  const monthStart = `${today.slice(0, 8)}01`;
  const since = monthStart < U.addDays(today, -30) ? monthStart : U.addDays(today, -30);

  const [products, variants, sales, open] = await Promise.all([
    GymProduct.findAll({ where: { venue_id: venueId, is_archived: false }, attributes: ["id", "name", "is_active"] }),
    GymProductVariant.findAll({ where: { venue_id: venueId, is_active: true } }),
    GymSale.findAll({ where: { venue_id: venueId, sold_on: { [Op.gte]: since }, status: { [Op.ne]: "cancelled" } }, limit: 5000 }),
    GymSale.findAll({ where: { venue_id: venueId, status: { [Op.in]: ["partial", "due"] } }, attributes: ["total", "amount_paid"] })
  ]);
  const pMap = new Map(products.map((p) => [p.id, p]));
  const live = variants.filter((v) => pMap.has(v.product_id) && pMap.get(v.product_id).is_active);

  const stock = { products: products.length, units: 0, cost_value: 0, retail_value: 0, low: 0, out: 0 };
  const lowList = [];
  const expiring = [];
  live.forEach((v) => {
    const q = Math.max(Number(v.stock_qty), 0);
    stock.units += q;
    stock.cost_value += q * Number(v.cost_price);
    stock.retail_value += q * Number(v.price);
    const st = stockStatus(v, s);
    const row = { variant_id: v.id, product_id: v.product_id, name: pMap.get(v.product_id).name, label: v.label, stock_qty: Number(v.stock_qty) };
    if (st === "out") stock.out += 1;
    if (st === "low") stock.low += 1;
    if (st !== "ok") lowList.push({ ...row, status: st });
    const ex = expiryState(v, today);
    if (ex) expiring.push({ ...row, expiry_date: v.expiry_date, state: ex });
  });
  stock.cost_value = r2(stock.cost_value);
  stock.retail_value = r2(stock.retail_value);

  const inMonth = sales.filter((x) => x.sold_on >= monthStart);
  const month = {
    bills: inMonth.length,
    total: r2(inMonth.reduce((n, x) => n + Number(x.total), 0)),
    // profit = what was charged without GST minus what the stock cost
    profit: r2(inMonth.reduce((n, x) => n + Number(x.total) - Number(x.tax_amount) - Number(x.cost_total), 0))
  };
  const todayRows = sales.filter((x) => x.sold_on === today);

  const top = new Map();
  sales.filter((x) => x.sold_on >= U.addDays(today, -30)).forEach((x) => (x.items || []).forEach((l) => {
    const k = `${l.product_id}|${l.variant_id}`;
    const cur = top.get(k) || { name: l.name, label: l.variant_label, qty: 0, amount: 0 };
    cur.qty += Number(l.qty);
    cur.amount += Number(l.amount);
    top.set(k, cur);
  }));

  return {
    stock,
    today: { bills: todayRows.length, total: r2(todayRows.reduce((n, x) => n + Number(x.total), 0)) },
    month,
    dues: { bills: open.length, total: r2(open.reduce((n, x) => n + Number(x.total) - Number(x.amount_paid), 0)) },
    low_list: lowList.sort((a, b) => a.stock_qty - b.stock_qty).slice(0, 8),
    expiring: expiring.sort((a, b) => String(a.expiry_date).localeCompare(String(b.expiry_date))).slice(0, 8),
    top_sellers: [...top.values()].sort((a, b) => b.qty - a.qty).slice(0, 5).map((t) => ({ ...t, amount: r2(t.amount) }))
  };
}

/* ---------- what visitors see on the gym website (no cost price, no exact stock) ---------- */
async function publicStore(venueId) {
  const s = await getSettings(venueId);
  if (!s.show_on_website) return { enabled: false, tagline: null, categories: [], products: [] };
  const today = U.todayIST();

  const [cats, products] = await Promise.all([
    GymStoreCategory.findAll({ where: { venue_id: venueId, is_active: true }, order: [["sort_order", "ASC"], ["name", "ASC"]] }),
    GymProduct.findAll({
      where: { venue_id: venueId, is_archived: false, is_active: true, show_on_website: true },
      order: [["is_featured", "DESC"], ["sort_order", "ASC"], ["name", "ASC"]], limit: 500
    })
  ]);
  const vars = await variantMap(venueId, products.map((p) => p.id));

  const out = [];
  products.forEach((p) => {
    const variants = (vars.get(p.id) || []).filter((v) => v.is_active).map((v) => {
      const price = Number(v.price);
      const mrp = v.mrp != null && Number(v.mrp) > price ? Number(v.mrp) : null;
      const sellable = Number(v.stock_qty) > 0 && expiryState(v, today) !== "expired";
      return {
        id: v.id, label: v.label, price, mrp, discount_percent: mrp ? Math.round(((mrp - price) / mrp) * 100) : 0,
        in_stock: sellable, low_stock: sellable && Number(v.stock_qty) <= lowLimit(v, s)
      };
    });
    if (!variants.length) return;
    const inStock = variants.some((v) => v.in_stock);
    if (!inStock && !s.show_out_of_stock) return;
    const offerLive = !p.offer_ends_on || p.offer_ends_on >= today;
    out.push({
      id: p.id, name: p.name, brand: p.brand, category_id: p.category_id, description: p.description, highlights: p.highlights || [],
      image_url: p.image_url, gallery: p.gallery || [], offer_label: offerLive ? p.offer_label : null, is_featured: p.is_featured,
      in_stock: inStock, min_price: Math.min(...variants.map((v) => v.price)), best_discount: Math.max(...variants.map((v) => v.discount_percent)), variants
    });
  });

  const used = new Set(out.map((p) => p.category_id));
  return {
    enabled: out.length > 0, tagline: s.tagline,
    categories: cats.filter((c) => used.has(c.id)).map((c) => ({ id: c.id, name: c.name, count: out.filter((p) => p.category_id === c.id).length })),
    products: out
  };
}

async function publicInvoice(token) {
  const s = token ? await GymSale.findOne({ where: { share_token: token } }) : null;
  if (!s) throw new AppError("Bill not found", 404);
  return s;
}

module.exports = {
  getSettings, updateSettings, listCategories, createCategory, updateCategory, deleteCategory,
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
  adjustStock, listMovements, posSearch, createSale, getSale, listSales, addPayment, cancelSale,
  overview, publicStore, publicInvoice, presentSale, STOCK_REASONS
};