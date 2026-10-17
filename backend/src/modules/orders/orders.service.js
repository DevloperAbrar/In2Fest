const crypto = require("crypto");
const { Op, fn, col } = require("sequelize");
const { ServiceItem, Client, Invoice } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { getSequelize } = require("../../utils/db");
const { r2 } = require("../../utils/taxEngine");
const { getBusinessTypeKey } = require("../../config/businessTypes");
const billingService = require("../billing/billing.service");
const { PickupOrder, PickupOrderSettings } = require("./orders.models");

const ACTIVE = ["pending", "accepted", "ready"];
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
const MAX_CODE_ATTEMPTS = 5;
const PAY_METHODS = ["cash", "upi", "card", "other"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const int = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function normalizePhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) throw new AppError("Enter a valid 10-digit mobile number", 400);
  return d;
}

// Pickup orders are for shops and food businesses only.
function supportsOrders(venue) {
  const cats = [venue.business_category, ...(venue.secondary_categories || [])].filter(Boolean);
  return cats.some((c) => ["retail", "food"].includes(getBusinessTypeKey(c)));
}

/* ───────────────────────── settings ───────────────────────── */
async function getSettings(venueId) {
  const [row] = await PickupOrderSettings.findOrCreate({ where: { venue_id: venueId }, defaults: { venue_id: venueId } });
  return row;
}

function settingsView(s) {
  return {
    enabled: s.enabled,
    accepting: s.accepting,
    default_prep_minutes: s.default_prep_minutes,
    min_order_amount: Number(s.min_order_amount),
    max_active_per_phone: s.max_active_per_phone,
    block_after_no_shows: s.block_after_no_shows,
    max_qty_per_item: s.max_qty_per_item,
    instructions: s.instructions || ""
  };
}

async function updateSettings(venueId, body = {}) {
  const s = await getSettings(venueId);
  const patch = {};
  if (body.enabled !== undefined) patch.enabled = Boolean(body.enabled);
  if (body.accepting !== undefined) patch.accepting = Boolean(body.accepting);
  if (body.default_prep_minutes !== undefined) patch.default_prep_minutes = int(body.default_prep_minutes, 5, 240, s.default_prep_minutes);
  if (body.min_order_amount !== undefined) {
    const n = Number(body.min_order_amount);
    patch.min_order_amount = n >= 0 && n <= 100000 ? r2(n) : 0;
  }
  if (body.max_active_per_phone !== undefined) patch.max_active_per_phone = int(body.max_active_per_phone, 1, 10, 2);
  if (body.block_after_no_shows !== undefined) patch.block_after_no_shows = int(body.block_after_no_shows, 1, 10, 2);
  if (body.max_qty_per_item !== undefined) patch.max_qty_per_item = int(body.max_qty_per_item, 1, 99, 20);
  if (body.instructions !== undefined) patch.instructions = clean(body.instructions, 300);
  await s.update(patch);
  return settingsView(s);
}

async function setAccepting(venueId, accepting) {
  const s = await getSettings(venueId);
  await s.update({ accepting: Boolean(accepting) });
  return settingsView(s);
}

function publicConfig(venue, s) {
  const supported = supportsOrders(venue);
  return {
    enabled: supported && s.enabled,
    accepting: s.accepting,
    prep_minutes: s.default_prep_minutes,
    min_order_amount: Number(s.min_order_amount),
    max_qty_per_item: s.max_qty_per_item,
    instructions: s.instructions || ""
  };
}

/* ───────────────────────── helpers ───────────────────────── */
async function lockVenue(venueId, t) {
  await t.sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:k))", {
    replacements: { k: `pickup:${venueId}` },
    transaction: t
  });
}

async function makeCode(venueId, t) {
  for (let i = 0; i < 30; i++) {
    const bytes = crypto.randomBytes(4);
    let code = "";
    for (let j = 0; j < 4; j++) code += CODE_CHARS[bytes[j] % CODE_CHARS.length];
    const clash = await PickupOrder.count({
      where: { venue_id: venueId, pickup_code: code, status: { [Op.in]: ACTIVE } },
      transaction: t
    });
    if (!clash) return code;
  }
  throw new AppError("Could not create a pickup code. Please try again.", 500);
}

async function isBlocked(venueId, phone, settings) {
  const fake = await PickupOrder.count({
    where: { venue_id: venueId, customer_phone: phone, status: "fake", counts_against: true }
  });
  if (fake > 0) return true;
  const since = new Date(Date.now() - 90 * 86400000);
  const noShows = await PickupOrder.count({
    where: { venue_id: venueId, customer_phone: phone, status: "no_show", counts_against: true, createdAt: { [Op.gt]: since } }
  });
  return noShows >= settings.block_after_no_shows;
}

const lineView = (i) => ({
  name: i.name, variant: i.variant || "", qty: Number(i.qty), unit_price: Number(i.unit_price), line_total: Number(i.line_total)
});

/* ───────────────────────── customer side ───────────────────────── */
async function placeOrder(venue, settings, body = {}, ip = "") {
  if (!supportsOrders(venue) || !settings.enabled) throw new AppError("This business is not taking online pickup orders.", 400);
  if (!settings.accepting) throw new AppError("Orders are paused right now. Please try again later or call us.", 400);

  const name = clean(body.name, 80);
  if (name.length < 2) throw new AppError("Please enter your name", 400);
  const phone = normalizePhone(body.phone);
  const note = clean(body.note, 300);

  const raw = Array.isArray(body.items) ? body.items : [];
  if (!raw.length) throw new AppError("Your order is empty", 400);
  if (raw.length > 40) throw new AppError("Too many items in one order", 400);

  // merge duplicate lines (same item + size)
  const wanted = new Map();
  raw.forEach((l) => {
    const id = String(l?.item_id || "");
    if (!UUID_RE.test(id)) throw new AppError("Invalid item in your order", 400);
    const qty = parseInt(l.qty, 10);
    if (!(qty >= 1)) throw new AppError("Quantity must be at least 1", 400);
    const variant = clean(l.variant, 30);
    const key = `${id}|${variant}`;
    const prev = wanted.get(key);
    wanted.set(key, { item_id: id, variant, qty: (prev?.qty || 0) + qty });
  });

  const ids = [...new Set([...wanted.values()].map((w) => w.item_id))];
  const rows = await ServiceItem.findAll({
    where: { id: ids, venue_id: venue.id, item_type: "product", is_active: true, show_on_website: true }
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  const items = [];
  let subtotal = 0;
  wanted.forEach((w) => {
    const it = byId.get(w.item_id);
    if (!it) throw new AppError("An item in your order is no longer available. Please refresh the menu.", 409);
    if (w.qty > settings.max_qty_per_item) throw new AppError(`You can order at most ${settings.max_qty_per_item} of ${it.name}`, 400);

    const labels = (Array.isArray(it.variants) ? it.variants : []).map((v) => v && v.label).filter(Boolean);
    let variant = w.variant;
    if (labels.length) {
      if (!variant || !labels.includes(variant)) throw new AppError(`Please choose a size / portion for ${it.name}`, 400);
    } else {
      variant = "";
    }

    if (it.track_stock) {
      const vs = it.variant_stock || {};
      const avail = labels.length && Object.keys(vs).length ? Number(vs[variant] || 0) : Number(it.stock_qty || 0);
      if (avail < w.qty) throw new AppError(avail > 0 ? `Only ${avail} of ${it.name} left` : `${it.name} is out of stock`, 409);
    }

    const price = r2(Number(it.default_price));
    const line = r2(price * w.qty);
    subtotal = r2(subtotal + line);
    items.push({
      item_id: it.id, name: it.name, variant, qty: w.qty, unit_price: price, line_total: line,
      unit: it.unit || "", hsn_sac: it.hsn_sac || "",
      tax_rate: it.tax_rate !== null && it.tax_rate !== undefined ? Number(it.tax_rate) : null
    });
  });

  if (Number(settings.min_order_amount) > 0 && subtotal < Number(settings.min_order_amount)) {
    throw new AppError(`Minimum order is ₹${Number(settings.min_order_amount)}`, 400);
  }
  if (await isBlocked(venue.id, phone, settings)) {
    throw new AppError("We can't take online orders from this number. Please call us.", 403);
  }

  const t = await getSequelize().transaction();
  try {
    await lockVenue(venue.id, t);
    const active = await PickupOrder.count({
      where: { venue_id: venue.id, customer_phone: phone, status: { [Op.in]: ACTIVE } },
      transaction: t
    });
    if (active >= settings.max_active_per_phone) {
      throw new AppError("You already have an order in progress. Please wait for it, or call us.", 429);
    }
    const last = await PickupOrder.max("order_no", { where: { venue_id: venue.id }, transaction: t });
    const order = await PickupOrder.create({
      venue_id: venue.id,
      order_no: (Number(last) || 0) + 1,
      status: "pending",
      customer_name: name,
      customer_phone: phone,
      customer_note: note || null,
      items,
      subtotal,
      total: subtotal,
      pickup_code: await makeCode(venue.id, t),
      track_token: crypto.randomBytes(18).toString("base64url"),
      placed_ip: String(ip || "").slice(0, 45)
    }, { transaction: t });
    await t.commit();
    return order;
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

// What the customer is allowed to see (reached only with the secret tracking link).
function publicView(o, venue, settings) {
  return {
    order_no: o.order_no,
    status: o.status,
    customer_name: o.customer_name,
    items: (o.items || []).map(lineView),
    total: Number(o.total),
    pickup_code: ACTIVE.includes(o.status) || o.status === "completed" ? o.pickup_code : null,
    placed_at: o.createdAt,
    promised_at: o.promised_at,
    ready_at: o.ready_at,
    completed_at: o.completed_at,
    cancel_reason: o.cancel_reason,
    cancelled_by: o.cancelled_by,
    edited: Boolean(o.edited_at),
    can_cancel: o.status === "pending",
    instructions: settings?.instructions || "",
    business: {
      name: venue.hall_name,
      phone: venue.phone || "",
      whatsapp: venue.whatsapp_number || venue.phone || "",
      address: [venue.address, venue.city].filter(Boolean).join(", ")
    }
  };
}

async function loadByToken(token) {
  const t = String(token || "");
  if (t.length < 20 || t.length > 60 || !/^[\w-]+$/.test(t)) throw new AppError("Order not found", 404);
  const order = await PickupOrder.findOne({ where: { track_token: t } });
  if (!order) throw new AppError("Order not found", 404);
  const { Venue } = require("../../database/models");
  const venue = await Venue.findByPk(order.venue_id);
  if (!venue) throw new AppError("Order not found", 404);
  return { order, venue, settings: await getSettings(venue.id) };
}

async function trackByToken(token) {
  const { order, venue, settings } = await loadByToken(token);
  return publicView(order, venue, settings);
}

async function customerCancel(token) {
  const { order, venue, settings } = await loadByToken(token);
  if (order.status !== "pending") {
    throw new AppError("This order is already being prepared. Please call the shop to cancel.", 400);
  }
  await order.update({ status: "cancelled", cancelled_at: new Date(), cancelled_by: "customer", cancel_reason: "Cancelled by customer", counts_against: false });
  return publicView(order, venue, settings);
}

/* ───────────────────────── vendor side ───────────────────────── */
function ownerView(o) {
  const j = o.toJSON();
  delete j.placed_ip;
  delete j.track_token;
  j.subtotal = Number(j.subtotal);
  j.total = Number(j.total);
  return j;
}

async function getOwned(venueId, id) {
  if (!UUID_RE.test(String(id))) throw new AppError("Order not found", 404);
  const order = await PickupOrder.findOne({ where: { id, venue_id: venueId } });
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

function requireStatus(order, allowed, message) {
  if (!allowed.includes(order.status)) throw new AppError(message, 400);
}

async function list(venueId, query = {}) {
  const history = query.scope === "history";
  const where = { venue_id: venueId, status: history ? { [Op.notIn]: ACTIVE } : { [Op.in]: ACTIVE } };

  const s = clean(query.q, 40).replace(/[%_\\]/g, "");
  if (s) {
    const or = [{ customer_name: { [Op.iLike]: `%${s}%` } }, { pickup_code: s.toUpperCase() }];
    const digits = s.replace(/\D/g, "");
    if (digits) {
      or.push({ customer_phone: { [Op.like]: `%${digits}%` } });
      if (digits.length <= 6) or.push({ order_no: Number(digits) });
    }
    where[Op.or] = or;
  }

  const rows = await PickupOrder.findAll({
    where,
    order: [["createdAt", history ? "DESC" : "ASC"]],
    limit: history ? 100 : 200
  });
  return rows.map(ownerView);
}

async function summary(venueId) {
  const counts = await PickupOrder.findAll({
    where: { venue_id: venueId, status: { [Op.in]: ACTIVE } },
    attributes: ["status", [fn("COUNT", col("id")), "n"]],
    group: ["status"],
    raw: true
  });
  const out = { pending: 0, accepted: 0, ready: 0, today_completed: 0, today_revenue: 0 };
  counts.forEach((r) => { out[r.status] = Number(r.n); });

  // start of today in IST
  const ist = new Date(Date.now() + 5.5 * 3600e3);
  ist.setUTCHours(0, 0, 0, 0);
  const start = new Date(ist.getTime() - 5.5 * 3600e3);
  const where = { venue_id: venueId, status: "completed", completed_at: { [Op.gte]: start } };
  out.today_completed = await PickupOrder.count({ where });
  out.today_revenue = Number(await PickupOrder.sum("total", { where })) || 0;
  return out;
}

async function accept(order, minutes, fallbackMinutes) {
  requireStatus(order, ["pending"], "Only new orders can be accepted");
  const m = int(minutes, 1, 480, fallbackMinutes || 20);
  const now = new Date();
  await order.update({ status: "accepted", accepted_at: now, prep_minutes: m, promised_at: new Date(now.getTime() + m * 60000) });
  return ownerView(order);
}

async function setEta(order, minutes) {
  requireStatus(order, ["accepted"], "You can change the time only while the order is being prepared");
  const m = int(minutes, 1, 480, null);
  if (!m) throw new AppError("Enter the minutes needed", 400);
  await order.update({ prep_minutes: m, promised_at: new Date(Date.now() + m * 60000) });
  return ownerView(order);
}

async function markReady(order) {
  requireStatus(order, ["pending", "accepted"], "Only a new or preparing order can be marked ready");
  const now = new Date();
  await order.update({
    status: "ready", ready_at: now, accepted_at: order.accepted_at || now,
    promised_at: !order.promised_at || order.promised_at > now ? now : order.promised_at
  });
  return ownerView(order);
}

async function cancel(order, reason, by = "vendor") {
  requireStatus(order, ACTIVE, "This order can no longer be cancelled");
  const r = clean(reason, 200);
  if (r.length < 2) throw new AppError("Please give a short reason (the customer will see it)", 400);
  await order.update({ status: "cancelled", cancelled_at: new Date(), cancelled_by: by, cancel_reason: r, counts_against: false });
  return ownerView(order);
}

async function markNoShow(order) {
  requireStatus(order, ["accepted", "ready"], "Only an accepted or ready order can be marked no-show");
  await order.update({ status: "no_show", cancelled_at: new Date(), cancelled_by: "vendor", cancel_reason: "Customer did not pick up", counts_against: true });
  return ownerView(order);
}

async function markFake(order) {
  requireStatus(order, ACTIVE, "Only an open order can be reported as fake");
  await order.update({ status: "fake", cancelled_at: new Date(), cancelled_by: "vendor", cancel_reason: "Cancelled by the shop", counts_against: true });
  return ownerView(order);
}

async function normalizeEditItems(venueId, rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length) throw new AppError("An order needs at least one item", 400);
  if (rawItems.length > 60) throw new AppError("Too many items", 400);

  const ids = rawItems.map((i) => String(i?.item_id || "")).filter((id) => UUID_RE.test(id));
  const rows = ids.length ? await ServiceItem.findAll({ where: { id: ids, venue_id: venueId } }) : [];
  const byId = new Map(rows.map((r) => [r.id, r]));

  return rawItems.map((raw, idx) => {
    const n = idx + 1;
    const qty = Number(raw.qty);
    if (!(qty > 0) || qty > 999) throw new AppError(`Item ${n}: enter a valid quantity`, 400);
    const price = Number(raw.unit_price);
    if (!(price >= 0) || price > 1000000) throw new AppError(`Item ${n}: enter a valid price`, 400);

    const hasId = UUID_RE.test(String(raw.item_id || ""));
    const row = hasId ? byId.get(raw.item_id) : null;
    if (hasId && !row) throw new AppError(`Item ${n} was not found in your catalog`, 400);

    const name = clean(raw.name || row?.name, 150);
    if (!name) throw new AppError(`Item ${n}: enter a name`, 400);

    return {
      item_id: row ? row.id : null,
      name,
      variant: clean(raw.variant, 30),
      qty: r2(qty),
      unit_price: r2(price),
      line_total: r2(qty * price),
      unit: row?.unit || clean(raw.unit, 20),
      hsn_sac: row?.hsn_sac || "",
      tax_rate: row && row.tax_rate !== null && row.tax_rate !== undefined ? Number(row.tax_rate) : null
    };
  });
}

async function edit(order, body = {}, user) {
  requireStatus(order, ACTIVE, "A finished order can't be edited");
  if (order.invoice_id) throw new AppError("A bill is already made for this order. Edit the bill in Billing instead.", 400);

  const patch = {};
  const fromTotal = Number(order.total);

  if (body.items !== undefined) {
    const items = await normalizeEditItems(order.venue_id, body.items);
    const total = r2(items.reduce((s, i) => s + i.line_total, 0));
    patch.items = items;
    patch.subtotal = total;
    patch.total = total;
    const log = [...(order.edit_log || []), { at: new Date().toISOString(), by: user?.id || null, from_total: fromTotal, to_total: total }];
    patch.edit_log = log.slice(-20);
    patch.edited_at = new Date();
  }
  if (body.customer_note !== undefined) patch.customer_note = clean(body.customer_note, 300) || null;
  if (body.customer_name !== undefined) {
    const nm = clean(body.customer_name, 80);
    if (nm.length >= 2) patch.customer_name = nm;
  }
  await order.update(patch);
  return ownerView(order);
}

async function findByCode(venueId, code) {
  const c = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length < 4) throw new AppError("Enter the 4-character pickup code", 400);
  const order = await PickupOrder.findOne({ where: { venue_id: venueId, pickup_code: c, status: { [Op.in]: ACTIVE } } });
  if (!order) throw new AppError("No open order has this code", 404);
  return order;
}

async function verifyCode(order, code) {
  if (order.code_verified_at) return;
  if (order.code_attempts >= MAX_CODE_ATTEMPTS) {
    throw new AppError("Too many wrong codes for this order. Use \"Skip code\" and write a reason.", 429);
  }
  const c = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c !== order.pickup_code) {
    await order.update({ code_attempts: order.code_attempts + 1 });
    const left = MAX_CODE_ATTEMPTS - order.code_attempts;
    throw new AppError(`Wrong code (${left} ${left === 1 ? "try" : "tries"} left)`, 400);
  }
  await order.update({ code_verified_at: new Date() });
}

/* ───────────────────────── billing link ───────────────────────── */
async function ensureClient(venue, order) {
  if (order.client_id) return order.client_id;
  const p = order.customer_phone;
  let c = await Client.findOne({ where: { venue_id: venue.id, phone: { [Op.in]: [p, `+91${p}`, `91${p}`] } } });
  if (!c) c = await Client.create({ venue_id: venue.id, name: order.customer_name, phone: p, source: "manual" });
  return c.id;
}

function invoiceBody(order, clientId) {
  return {
    type: "invoice",
    client_id: clientId,
    customer: { name: order.customer_name, phone: order.customer_phone },
    line_items: (order.items || []).map((i) => ({
      item_id: i.item_id || undefined, // lets billing take the stock out
      variant: i.variant || undefined,
      description: i.variant ? `${i.name} (${i.variant})` : i.name,
      quantity: i.qty,
      rate: i.unit_price,
      unit: i.unit || undefined,
      hsn_sac: i.hsn_sac || undefined,
      tax_rate: i.tax_rate ?? undefined
    })),
    notes: `Pickup order #${order.order_no}`
  };
}

// Creates the invoice and updates the order in the SAME transaction (all or nothing).
async function createInvoiceFor(venue, order, orderPatch = {}) {
  const clientId = await ensureClient(venue, order);
  return billingService.createDocument(venue, invoiceBody(order, clientId), {
    afterCreate: async (inv, t) => {
      const fresh = await PickupOrder.findByPk(order.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (fresh.invoice_id) throw new AppError("A bill was already made for this order", 409);
      await order.update({ invoice_id: inv.id, client_id: clientId, ...orderPatch }, { transaction: t });
    }
  });
}

async function addPayment(venue, invoiceId, { method, amount } = {}, userId) {
  const t = await getSequelize().transaction();
  let invoice;
  try {
    invoice = await Invoice.findOne({ where: { id: invoiceId, venue_id: venue.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!invoice) throw new AppError("Bill not found", 404);
    const balance = r2(Number(invoice.total) - Number(invoice.amount_paid));
    const pay = r2(amount === undefined || amount === null ? balance : amount);
    if (!(pay > 0)) { await t.commit(); return invoice; }
    if (pay > balance + 0.009) throw new AppError("Payment is more than the balance due", 400);

    const payment = {
      id: crypto.randomUUID(), amount: pay, method: PAY_METHODS.includes(method) ? method : "cash",
      reference: "", note: "Pickup order payment", paid_at: new Date().toISOString(), recorded_by: userId || null
    };
    const payments = [...(invoice.payments || []), payment];
    const amountPaid = r2(payments.reduce((s, p) => s + Number(p.amount), 0));
    const balanceDue = Math.max(r2(Number(invoice.total) - amountPaid), 0);
    invoice.payments = payments;
    invoice.amount_paid = amountPaid;
    invoice.balance_due = balanceDue;
    invoice.payment_status = balanceDue <= 0.009 ? "paid" : "partial";
    if (invoice.payment_status === "paid") invoice.status = "paid";
    await invoice.save({ transaction: t });
    await t.commit();
  } catch (e) {
    await billingService.safeRollback(t);
    throw e;
  }

  // best effort: refresh the PDF so it shows "Paid"
  try {
    const clientRecord = invoice.client_id ? await Client.findByPk(invoice.client_id) : null;
    const { Venue } = require("../../database/models");
    const v = await Venue.findByPk(invoice.venue_id);
    invoice.pdf_url = await billingService.renderAndStorePdf(invoice, v, billingService.buildPdfCustomer(clientRecord, invoice.customer_snapshot || {}));
    await invoice.save();
  } catch (e) {
    console.error("[ORDERS] PDF refresh after payment failed:", e.message);
  }
  return invoice;
}

const invoiceView = (inv) => inv && ({
  id: inv.id, invoice_number: inv.invoice_number, total: Number(inv.total), payment_status: inv.payment_status, pdf_url: inv.pdf_url
});

async function currentInvoice(order) {
  if (!order.invoice_id) return null;
  const inv = await Invoice.findByPk(order.invoice_id);
  if (!inv) await order.update({ invoice_id: null }); // bill was deleted: allow a new one
  return inv;
}

// Generates the bill but keeps the order open (e.g. to print while packing).
async function createBill(venue, order) {
  requireStatus(order, ACTIVE, "This order is already finished");
  let inv = await currentInvoice(order);
  if (!inv) inv = await createInvoiceFor(venue, order);
  await order.reload();
  return { order: ownerView(order), invoice: invoiceView(inv) };
}

// Handover: check the pickup code -> make the bill -> (optionally) record payment -> done.
async function complete(venue, order, user, body = {}) {
  requireStatus(order, ["accepted", "ready"], "Accept the order first, then complete it at pickup");

  if (!order.code_verified_at) {
    if (body.code) {
      await verifyCode(order, body.code);
    } else {
      const reason = clean(body.override_reason, 200);
      if (reason.length < 3) throw new AppError("Enter the pickup code from the customer's phone, or write a reason to skip it", 400);
      await order.update({ code_override_reason: reason });
    }
  }

  const now = new Date();
  const patch = { status: "completed", completed_at: now, ready_at: order.ready_at || now };
  let inv = await currentInvoice(order);
  if (inv) await order.update(patch);
  else inv = await createInvoiceFor(venue, order, patch);

  let warning = null;
  if (body.mark_paid) {
    try {
      inv = await addPayment(venue, inv.id, { method: body.payment_method }, user?.id);
    } catch (e) {
      warning = `Bill is ready, but the payment could not be recorded: ${e.message}`;
    }
  }
  await order.reload();
  return { order: ownerView(order), invoice: invoiceView(inv), warning };
}

/* ───────────────────────── blocked numbers ───────────────────────── */
async function listBlocked(venueId) {
  const s = await getSettings(venueId);
  const rows = await PickupOrder.findAll({
    where: { venue_id: venueId, counts_against: true, status: { [Op.in]: ["fake", "no_show"] } },
    attributes: ["customer_phone", "customer_name", "status", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: 300
  });
  const map = new Map();
  rows.forEach((r) => {
    const e = map.get(r.customer_phone) || { phone: r.customer_phone, name: r.customer_name, no_shows: 0, fake: 0, last_at: r.createdAt };
    if (r.status === "fake") e.fake += 1; else e.no_shows += 1;
    map.set(r.customer_phone, e);
  });
  return [...map.values()].filter((e) => e.fake > 0 || e.no_shows >= s.block_after_no_shows);
}

async function clearBlocked(venueId, phone) {
  const p = normalizePhone(phone);
  await PickupOrder.update({ counts_against: false }, { where: { venue_id: venueId, customer_phone: p, status: { [Op.in]: ["fake", "no_show"] } } });
  return { cleared: true };
}

module.exports = {
  supportsOrders, getSettings, settingsView, updateSettings, setAccepting, publicConfig,
  placeOrder, publicView, trackByToken, customerCancel,
  ownerView, getOwned, list, summary, accept, setEta, markReady, cancel, markNoShow, markFake,
  edit, findByCode, createBill, complete, listBlocked, clearBlocked
};