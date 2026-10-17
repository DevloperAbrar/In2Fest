const { sequelize } = require("../../config/database");
const { FoodItem, FoodSettings } = require("./food.models");
const { AppError } = require("../../middleware/error.middleware");
const { calculateDocument, r2 } = require("../../utils/taxEngine");
const env = require("../../config/env");
const U = require("../gym/gym.utils");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AGGREGATORS = ["zomato", "swiggy", "other_app"];

const hourIST = () => new Date(Date.now() + 330 * 60000).getUTCHours();
const siteUrl = (venue) => `https://${venue.subdomain}.${env.baseDomain}`;

async function getSettings(venueId) {
  const [row] = await FoodSettings.findOrCreate({ where: { venue_id: venueId }, defaults: { venue_id: venueId } });
  return row;
}

// Sequential per-venue numbers without gaps or races (same approach as the gym module).
async function nextSeq(tx, venueId, table, col, extraWhere = "", extraRepl = {}) {
  await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:k))", {
    replacements: { k: `${table}:${col}:${venueId}:${extraRepl.d || ""}` }, transaction: tx
  });
  const [[row]] = await sequelize.query(`SELECT COALESCE(MAX(${col}), 0) + 1 AS n FROM ${table} WHERE venue_id = :v ${extraWhere}`, {
    replacements: { v: venueId, ...extraRepl }, transaction: tx
  });
  return Number(row.n);
}

// Turns what the customer / cashier sent into trusted lines. Prices ALWAYS come from the database.
async function resolveLines(venueId, raw, { owner = false } = {}) {
  if (!Array.isArray(raw) || raw.length === 0) throw new AppError("Add at least one item", 400);
  if (raw.length > 40) throw new AppError("Too many items in one order", 400);

  const ids = [...new Set(raw.map((l) => l && l.item_id).filter((x) => UUID_RE.test(String(x))))];
  const rows = ids.length ? await FoodItem.findAll({ where: { id: ids, venue_id: venueId, is_active: true } }) : [];
  const byId = new Map(rows.map((r) => [r.id, r]));

  return raw.map((l, i) => {
    const line = l || {};
    const quantity = U.num(line.qty ?? line.quantity, "Quantity", { min: 1, max: 50, int: true });
    const note = String(line.note || "").trim().slice(0, 80);

    if (line.item_id) {
      const it = byId.get(line.item_id);
      if (!it) throw new AppError(`Item ${i + 1} is no longer on the menu`, 400);
      if (!it.is_available) throw new AppError(`${it.name} is sold out right now`, 409);
      let rate = Number(it.price);
      let variant = "";
      const variants = Array.isArray(it.variants) ? it.variants : [];
      if (variants.length) {
        const v = variants.find((x) => x.name === line.variant);
        if (!v) throw new AppError(`Choose a size for ${it.name}`, 400);
        rate = Number(v.price);
        variant = v.name;
      }
      return {
        item_id: it.id, name: it.name, variant, description: variant ? `${it.name} (${variant})` : it.name,
        quantity, rate,
        tax_rate: it.tax_rate !== null && it.tax_rate !== undefined ? Number(it.tax_rate) : undefined,
        hsn_sac: it.hsn_sac || "996331", unit_id: it.unit_id || null, food_type: it.food_type, note
      };
    }

    if (!owner) throw new AppError("Invalid item in the order", 400);
    const name = String(line.name || "").trim().slice(0, 100);
    if (!name) throw new AppError(`Item ${i + 1} needs a name`, 400);
    const rate = U.num(line.price ?? line.rate, "Price", { min: 0, max: 100000 });
    return { item_id: null, name, variant: "", description: name, quantity, rate, hsn_sac: "996331", unit_id: null, food_type: null, note };
  });
}

// GST is charged only when the business has GST on and a GSTIN, and is not a composition dealer.
const taxOn = (venue, settings) => Boolean(venue.gst_enabled && venue.gst_number) && settings.gst_scheme === "regular";

function computeBill(venue, settings, lines, { orderType, serviceCharge = false, discountType = "none", discountValue = 0 } = {}) {
  const gstOn = taxOn(venue, settings);
  const defRate = Number(settings.default_tax_rate);
  const base = r2(lines.reduce((s, l) => s + l.quantity * l.rate, 0));

  const extras = [];
  const sc = Number(settings.service_charge_percent);
  if (serviceCharge && sc > 0) extras.push(["Service charge", r2((base * sc) / 100)]);
  if (orderType !== "dine_in" && Number(settings.packing_fee) > 0) extras.push(["Packing charge", Number(settings.packing_fee)]);
  if (orderType === "delivery" && Number(settings.delivery_fee) > 0) {
    const free = Number(settings.free_delivery_above);
    if (!(free > 0 && base >= free)) extras.push(["Delivery charge", Number(settings.delivery_fee)]);
  }

  const all = [
    ...lines,
    ...extras.map(([label, amount]) => ({ description: label, name: label, quantity: 1, rate: amount, tax_rate: defRate, kind: "charge" }))
  ];
  const calc = calculateDocument(all, {
    gstEnabled: gstOn, defaultGstRate: defRate, supplyType: "intra",
    priceIncludesTax: gstOn && Boolean(settings.prices_include_tax),
    discountType, discountValue, roundOff: true
  });

  return {
    gst_on: gstOn, lines: calc.lineItems, subtotal: calc.subtotal, discount_amount: calc.discountAmount,
    taxable_amount: calc.taxableAmount, cgst: calc.cgst, sgst: calc.sgst, tax_breakup: calc.taxBreakup,
    round_off: calc.roundOff, total: calc.total
  };
}

function commissionFor(settings, source, total, override) {
  if (!AGGREGATORS.includes(source)) return { percent: 0, amount: 0 };
  const raw = override !== undefined && override !== "" && override !== null ? Number(override) : Number(settings.aggregator_commission);
  const percent = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 50) : 0;
  return { percent, amount: r2((total * percent) / 100) };
}

function presentOrder(o) {
  const j = typeof o.toJSON === "function" ? o.toJSON() : { ...o };
  ["subtotal", "discount_amount", "taxable_amount", "cgst", "sgst", "round_off", "total", "amount_paid", "commission_percent", "commission_amount"]
    .forEach((k) => { if (j[k] !== undefined && j[k] !== null) j[k] = Number(j[k]); });
  return j;
}

function upiLink(venue, order) {
  const pa = String(venue.upi_id || "").trim();
  if (!/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(pa)) return null;
  return `upi://pay?pa=${pa}&pn=${encodeURIComponent(venue.hall_name || "Restaurant")}&am=${Number(order.total).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${order.order_no}`)}`;
}

// Safe-to-publish settings for the public ordering page.
function publicConfig(venue, s) {
  return {
    restaurant: venue.hall_name,
    accepting_orders: s.accepting_orders,
    allow_delivery: s.allow_delivery, allow_pickup: s.allow_pickup, allow_dine_in: s.allow_dine_in,
    min_order: Number(s.min_order), delivery_fee: Number(s.delivery_fee),
    free_delivery_above: Number(s.free_delivery_above), packing_fee: Number(s.packing_fee),
    prep_time_min: s.prep_time_min, delivery_note: s.delivery_note || "",
    whatsapp: U.waFromAny(venue.whatsapp_number || venue.phone), phone: venue.phone || ""
  };
}

module.exports = {
  UUID_RE, AGGREGATORS, hourIST, siteUrl, getSettings, nextSeq, resolveLines, taxOn, computeBill,
  commissionFor, presentOrder, upiLink, publicConfig
};