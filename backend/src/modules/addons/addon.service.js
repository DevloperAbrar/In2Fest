// Add-ons: catalog + prices (Super Admin), what a vendor can buy, and who owns what.
// Pricing and GST reuse plans/planPricing.js unchanged: an add-on price row looks like a Plan.
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const env = require("../../config/env");
const { Venue, Subscription, Plan, Payment } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { isSubscriptionLive } = require("../../utils/planAccess");
const VS = require("../../config/vendorSegments");
const catalog = require("../../config/addonCatalog");
const { getPlanPricing, computeQuote, normalizeCycle, roundRupee, MAX_DISCOUNT } = require("../plans/planPricing");
const { AddonPrice, VenueAddon } = require("./addon.models");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 86400000;
const MAX_STACK_DAYS = 800; // a vendor cannot pre-pay more than about 2 years ahead
const MAX_GRANT_DAYS = 3650;
const MANUAL_METHODS = ["upi_manual", "cash_manual", "bank_transfer"];

const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY_MS);
// Adds calendar months and keeps the day inside the month (31 Jan + 1 month = 28/29 Feb).
function addMonths(d, n) {
  const r = new Date(d);
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + n);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

const needVenueId = (id) => {
  if (!UUID_RE.test(String(id || ""))) throw new AppError("A valid venueId is required", 400);
  return String(id);
};
const needDef = (key) => {
  const def = catalog.get(String(key || ""));
  if (!def) throw new AppError("Add-on not found", 404);
  return def;
};

// A price row behaves like a Plan for planPricing.js.
const asPlan = (row) => ({
  monthly_price: row ? row.monthly_price : 0,
  yearly_price: row ? row.yearly_price : null,
  discount_percent: row ? row.discount_percent : 0,
  offer_name: row ? row.offer_name : null,
  offer_ends_at: row ? row.offer_ends_at : null,
  gst_inclusive: row ? row.gst_inclusive === true : false
});

const isSellable = (row) => !!row && row.is_active === true && Number(row.monthly_price) > 0;

const liveRow = (row) => !!row && row.status === "active" && new Date(row.ends_at) > new Date();

function entitlementView(row) {
  if (!row) return null;
  const live = liveRow(row);
  return {
    live,
    status: live ? "active" : row.status === "cancelled" ? "cancelled" : "expired",
    source: row.source,
    billing_cycle: row.billing_cycle,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    days_left: live ? Math.max(0, Math.ceil((new Date(row.ends_at) - Date.now()) / DAY_MS)) : 0
  };
}

/* ------------------------------ price catalog (Super Admin) ------------------------------ */

async function pricesByKey() {
  const rows = await AddonPrice.findAll();
  return new Map(rows.map((r) => [r.addon_key, r]));
}

async function listCatalog() {
  const prices = await pricesByKey();
  const counts = await sequelize.query(
    `SELECT addon_key,
            COUNT(*) FILTER (WHERE status = 'active' AND ends_at > NOW()) AS live,
            COUNT(*) AS total
       FROM venue_addons GROUP BY addon_key`,
    { type: QueryTypes.SELECT }
  );
  const byKey = new Map(counts.map((c) => [c.addon_key, c]));
  return catalog.ADDONS.slice().sort((a, b) => a.sort - b.sort).map((def) => {
    const row = prices.get(def.key) || null;
    const c = byKey.get(def.key);
    return {
      key: def.key, label: def.label, description: def.description, parent: def.parent, segments: def.segments,
      price: {
        monthly_price: row ? Number(row.monthly_price) : 0,
        yearly_price: row && row.yearly_price !== null ? Number(row.yearly_price) : null,
        discount_percent: row ? row.discount_percent : 0,
        offer_name: row ? row.offer_name : null,
        offer_ends_at: row ? row.offer_ends_at : null,
        gst_inclusive: row ? row.gst_inclusive === true : false,
        is_active: row ? row.is_active === true : false
      },
      pricing: getPlanPricing(asPlan(row)),
      live_count: c ? Number(c.live) : 0,
      total_count: c ? Number(c.total) : 0
    };
  });
}

async function updatePricing(key, input, adminId) {
  const def = needDef(key);
  const body = input || {};
  const patch = {};

  if (body.monthly_price !== undefined) {
    const n = Number(body.monthly_price);
    if (!Number.isFinite(n) || n < 0 || n > 1000000) throw new AppError("Monthly price must be a number from 0 to 10,00,000", 400);
    patch.monthly_price = roundRupee(n);
  }
  if (body.yearly_price !== undefined) {
    if (body.yearly_price === null || body.yearly_price === "") patch.yearly_price = null;
    else {
      const n = Number(body.yearly_price);
      if (!Number.isFinite(n) || n < 0 || n > 10000000) throw new AppError("Yearly price must be a positive number", 400);
      patch.yearly_price = n > 0 ? roundRupee(n) : null;
    }
  }
  if (body.discount_percent !== undefined) {
    const d = Math.round(Number(body.discount_percent) || 0);
    if (d < 0 || d > MAX_DISCOUNT) throw new AppError(`Discount must be between 0% and ${MAX_DISCOUNT}%`, 400);
    patch.discount_percent = d;
  }
  if (body.offer_name !== undefined) patch.offer_name = String(body.offer_name || "").trim().slice(0, 80) || null;
  if (body.offer_ends_at !== undefined) {
    if (!body.offer_ends_at) patch.offer_ends_at = null;
    else {
      const str = String(body.offer_ends_at);
      const d = str.length <= 10 ? new Date(`${str}T23:59:59`) : new Date(str);
      if (Number.isNaN(d.getTime())) throw new AppError("Invalid offer end date", 400);
      patch.offer_ends_at = d;
    }
  }
  if (body.gst_inclusive !== undefined) patch.gst_inclusive = body.gst_inclusive === true || body.gst_inclusive === "true";
  if (body.is_active !== undefined) patch.is_active = body.is_active === true || body.is_active === "true";
  if (patch.discount_percent === 0) { patch.offer_name = null; patch.offer_ends_at = null; }

  const [row] = await AddonPrice.findOrCreate({ where: { addon_key: def.key }, defaults: { monthly_price: 0, is_active: false } });
  const next = { ...row.toJSON(), ...patch };
  if (next.is_active && !(Number(next.monthly_price) > 0)) throw new AppError("Set a monthly price above 0 before making the add-on available to vendors", 400);
  if (next.yearly_price !== null && next.yearly_price !== undefined && Number(next.yearly_price) > 0 && Number(next.monthly_price) <= 0) {
    throw new AppError("Set the monthly price first", 400);
  }

  await row.update({ ...patch, updated_by: adminId || null });
  const list = await listCatalog();
  return list.find((a) => a.key === def.key);
}

/* ------------------------------ vendor side ------------------------------ */

async function loadVenue(venueId) {
  const venue = await Venue.findByPk(needVenueId(venueId), {
    include: [{ model: Subscription, as: "subscription", include: [{ model: Plan, as: "plan" }] }]
  });
  if (!venue) throw new AppError("Venue not found", 404);
  return venue;
}

// Is this add-on meant for this vendor's business type, and does the plan have its base module?
function applicability(venue, def) {
  const seg = VS.segmentForCategory(venue.business_category);
  if (!seg || !def.segments.includes(seg.key)) return { ok: false, reason: "business_type" };
  const live = isSubscriptionLive(venue.subscription);
  const planFeatures = (venue.subscription && venue.subscription.plan && venue.subscription.plan.features) || [];
  if (!live || !planFeatures.includes(def.parent)) return { ok: false, reason: "plan" };
  return { ok: true, included: planFeatures.includes(def.key) };
}

// What the "Add-ons" section of the vendor's Subscription page shows.
async function listForVenue(venueId) {
  const venue = await loadVenue(venueId);
  const prices = await pricesByKey();
  const rows = await VenueAddon.findAll({ where: { venue_id: venue.id } });
  const mine = new Map(rows.map((r) => [r.addon_key, r]));
  const out = [];
  for (const def of catalog.ADDONS.slice().sort((a, b) => a.sort - b.sort)) {
    const fit = applicability(venue, def);
    if (!fit.ok) continue; // other business types never see it
    const price = prices.get(def.key) || null;
    const ent = entitlementView(mine.get(def.key));
    const sellable = isSellable(price);
    // Not for sale yet and the vendor does not have it: stays invisible.
    if (!fit.included && !sellable && !(ent && ent.live)) continue;
    out.push({
      key: def.key, label: def.label, description: def.description,
      included_in_plan: fit.included === true,
      can_buy: sellable && !fit.included,
      entitlement: ent,
      monthly_price: price ? Number(price.monthly_price) : 0,
      gst_inclusive: price ? price.gst_inclusive === true : false,
      pricing: getPlanPricing(asPlan(price))
    });
  }
  return out;
}

// The checkout quote for one add-on. Referral discount and credit never apply to add-ons.
async function quoteFor(venueId, key, cycleRaw) {
  const def = needDef(key);
  const venue = await loadVenue(venueId);
  const fit = applicability(venue, def);
  if (!fit.ok) throw new AppError("This add-on is not available for your account", 403);
  if (fit.included) throw new AppError("This feature is already included in your plan", 400);
  const price = await AddonPrice.findByPk(def.key);
  if (!isSellable(price)) throw new AppError("This add-on is not available right now", 400);

  const existing = await VenueAddon.findOne({ where: { venue_id: venue.id, addon_key: def.key } });
  if (liveRow(existing) && (new Date(existing.ends_at) - Date.now()) / DAY_MS > MAX_STACK_DAYS) {
    throw new AppError("This add-on is already active for a long time. You can renew it closer to the end date.", 400);
  }
  const cycle = normalizeCycle(cycleRaw);
  const quote = computeQuote(asPlan(price), cycle, 0, env.gstRate, 0);
  if (!(quote.total_payable >= 1)) throw new AppError("This add-on is not available right now", 400);
  return { venue, def, price, cycle, quote };
}

/* ------------------------------ entitlements ------------------------------ */

// Gives (or extends) an add-on. Time stacks on top of what is left, like plan renewals.
// MUST run inside a transaction: the advisory lock makes two payments for the same vendor and
// add-on wait for each other instead of overwriting one another.
async function applyEntitlement(t, o) {
  await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:k))", {
    replacements: { k: `addon:${o.venueId}:${o.key}` },
    transaction: t
  });
  const now = new Date();
  const row = await VenueAddon.findOne({ where: { venue_id: o.venueId, addon_key: o.key }, transaction: t });
  const liveEnd = row && liveRow(row) ? new Date(row.ends_at) : null;
  const base = liveEnd || now;
  const end = o.days
    ? addDays(base, o.days)
    : o.cycle === "yearly" ? addMonths(base, 12) : addMonths(base, 1);

  const fields = {
    status: "active",
    source: o.source,
    billing_cycle: o.cycle || null,
    starts_at: liveEnd ? row.starts_at : now,
    ends_at: end,
    locked_price: o.lockedPrice === undefined || o.lockedPrice === null ? null : o.lockedPrice,
    last_payment_id: o.paymentId || null,
    granted_by: o.grantedBy || null,
    note: o.note ? String(o.note).slice(0, 300) : null,
    cancelled_at: null
  };
  if (row) { await row.update(fields, { transaction: t }); return row; }
  return VenueAddon.create({ venue_id: o.venueId, addon_key: o.key, ...fields }, { transaction: t });
}

/* ------------------------------ Super Admin: assign / revoke / list ------------------------------ */

async function adminGrant(admin, input) {
  const body = input || {};
  const def = needDef(body.addon_key);
  const venue = await loadVenue(body.venue_id);
  const seg = VS.segmentForCategory(venue.business_category);
  if (!seg || !def.segments.includes(seg.key)) throw new AppError(`${def.label} is not available for this vendor's business type`, 400);

  const mode = String(body.mode || "");
  if (!["paid", "trial", "complimentary"].includes(mode)) throw new AppError("Choose paid, trial or complimentary", 400);
  const note = String(body.note || "").trim().slice(0, 300) || null;

  let cycle = null;
  let days = null;
  let amount = 0;
  let method = null;

  if (mode === "paid") {
    cycle = normalizeCycle(body.cycle);
    amount = roundRupee(body.amount);
    if (!(amount > 0) || amount > 10000000) throw new AppError("Enter the amount received (with GST)", 400);
    method = MANUAL_METHODS.includes(body.method) ? body.method : "upi_manual";
  } else {
    days = Math.floor(Number(body.days));
    if (!Number.isFinite(days) || days < 1 || days > MAX_GRANT_DAYS) throw new AppError(`Days must be between 1 and ${MAX_GRANT_DAYS}`, 400);
  }

  const t = await sequelize.transaction();
  try {
    let paymentRow = null;
    let lockedPrice = null;
    if (mode === "paid") {
      const rate = env.gstRate;
      const taxable = roundRupee(amount / (1 + rate / 100));
      lockedPrice = taxable;
      paymentRow = await Payment.create({
        venue_id: venue.id, amount, method, status: "success",
        plan_name_snapshot: `Add-on: ${def.label}`,
        base_amount: taxable, discount_amount: 0, credit_used: 0,
        gst_rate: rate, gst_amount: roundRupee(amount - taxable), total_amount: amount,
        recorded_by: admin.id,
        notes: `Add-on ${def.label} (${cycle}) recorded by admin${note ? `: ${note}` : ""}`
      }, { transaction: t });
    }
    const row = await applyEntitlement(t, {
      venueId: venue.id, key: def.key,
      source: mode === "paid" ? "manual" : mode,
      cycle, days, lockedPrice, paymentId: paymentRow ? paymentRow.id : null,
      grantedBy: admin.id, note
    });
    if (paymentRow) await paymentRow.update({ period_covered_start: row.starts_at, period_covered_end: row.ends_at }, { transaction: t });
    await t.commit();

    const planFeatures = (venue.subscription && venue.subscription.plan && venue.subscription.plan.features) || [];
    return {
      entitlement: entitlementView(row),
      warning: planFeatures.includes(def.parent) ? null : `This vendor's plan does not include ${def.parent}, so ${def.label} will not work until they have it.`
    };
  } catch (e) {
    try { await t.rollback(); } catch (_) { /* already finished */ }
    throw e;
  }
}

async function adminRevoke(admin, input) {
  const body = input || {};
  const def = needDef(body.addon_key);
  const venueId = needVenueId(body.venue_id);
  const row = await VenueAddon.findOne({ where: { venue_id: venueId, addon_key: def.key } });
  if (!row) throw new AppError("This vendor does not have this add-on", 404);
  await row.update({
    status: "cancelled", ends_at: new Date(), cancelled_at: new Date(), granted_by: admin.id,
    note: String(body.note || row.note || "").slice(0, 300) || null
  });
  return { entitlement: entitlementView(row) };
}

async function listHolders(key, query) {
  const def = needDef(key);
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const search = String(query.search || "").trim().slice(0, 60);
  const filter = ["live", "ended"].includes(query.status) ? query.status : "all";

  const where = ["a.addon_key = :key"];
  const rep = { key: def.key, limit, offset: (page - 1) * limit };
  if (search) { where.push("(v.hall_name ILIKE :q OR v.subdomain ILIKE :q OR v.city ILIKE :q)"); rep.q = `%${search}%`; }
  if (filter === "live") where.push("a.status = 'active' AND a.ends_at > NOW()");
  if (filter === "ended") where.push("NOT (a.status = 'active' AND a.ends_at > NOW())");

  const base = `FROM venue_addons a JOIN venues v ON v.id = a.venue_id WHERE ${where.join(" AND ")}`;
  const [rows, count] = await Promise.all([
    sequelize.query(
      `SELECT a.id, a.venue_id, a.status, a.source, a.billing_cycle, a.starts_at, a.ends_at, a.locked_price, a.note,
              (a.status = 'active' AND a.ends_at > NOW()) AS live,
              v.hall_name, v.city, v.subdomain
         ${base} ORDER BY a.ends_at DESC LIMIT :limit OFFSET :offset`,
      { replacements: rep, type: QueryTypes.SELECT }
    ),
    sequelize.query(`SELECT COUNT(*) AS n ${base}`, { replacements: rep, type: QueryTypes.SELECT })
  ]);
  const total = Number(count[0].n);
  return { holders: rows, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
}

async function venueEntitlements(venueId) {
  const id = needVenueId(venueId);
  const rows = await VenueAddon.findAll({ where: { venue_id: id } });
  return rows.map((r) => ({ addon_key: r.addon_key, label: (catalog.get(r.addon_key) || {}).label || r.addon_key, ...entitlementView(r) }));
}

module.exports = {
  listCatalog, updatePricing, listForVenue, quoteFor, applyEntitlement, loadVenue,
  adminGrant, adminRevoke, listHolders, venueEntitlements,
  entitlementView, asPlan, needDef, UUID_RE
};