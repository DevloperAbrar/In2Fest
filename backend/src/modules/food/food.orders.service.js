const { Op } = require("sequelize");
const { sequelize } = require("../../config/database");
const { FoodOrder, FoodItem, FoodTable, FoodUnit, FoodCustomer, FoodIngredient, FoodStockLog } = require("./food.models");
const { AppError } = require("../../middleware/error.middleware");
const { r2 } = require("../../utils/taxEngine");
const U = require("../gym/gym.utils");
const C = require("./food.constants");
const core = require("./food.core");

const { UUID_RE } = core;
const r3 = (n) => Math.round(Number(n) * 1000) / 1000;
const RANK = { new: 0, preparing: 1, ready: 2, completed: 3 };

async function inTx(fn) {
  const t = await sequelize.transaction();
  try {
    const out = await fn(t);
    await t.commit();
    return out;
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

function parseDiscount(owner, b) {
  const type = owner && ["flat", "percentage"].includes(b.discount_type) ? b.discount_type : "none";
  const value = type === "none" ? 0 : U.num(b.discount_value, "Discount", { min: 0, max: type === "percentage" ? 100 : 100000 });
  return { discountType: type, discountValue: value };
}

/* ---------------- stock + customers (always inside the order transaction) ---------------- */
async function deductStock(t, order) {
  if (order.stock_deducted) return;
  const itemIds = [...new Set((order.items || []).map((l) => l.item_id).filter(Boolean))];
  if (!itemIds.length) return;

  const items = await FoodItem.findAll({ where: { id: itemIds, venue_id: order.venue_id }, attributes: ["id", "recipe"], transaction: t });
  const recipes = new Map(items.map((i) => [i.id, Array.isArray(i.recipe) ? i.recipe : []]));
  const need = new Map();
  (order.items || []).forEach((l) => {
    (recipes.get(l.item_id) || []).forEach((r) => {
      need.set(r.ingredient_id, (need.get(r.ingredient_id) || 0) + Number(r.qty) * Number(l.quantity));
    });
  });
  if (!need.size) return;

  const ings = await FoodIngredient.findAll({ where: { id: [...need.keys()], venue_id: order.venue_id }, transaction: t, lock: t.LOCK.UPDATE });
  for (const ing of ings) {
    const used = r3(need.get(ing.id));
    const balance = r3(Number(ing.stock_qty) - used);
    await ing.update({ stock_qty: balance }, { transaction: t });
    await FoodStockLog.create({
      venue_id: order.venue_id, ingredient_id: ing.id, type: "sale", qty_change: -used, balance_after: balance,
      note: `Order #${order.order_no}`, order_id: order.id
    }, { transaction: t });
  }
}

async function completeOrder(t, order) {
  await deductStock(t, order);
  await order.update({ status: "completed", completed_at: new Date(), stock_deducted: true }, { transaction: t });
}

async function touchCustomer(t, venueId, { phone, name, total }) {
  const now = new Date();
  const [c] = await FoodCustomer.findOrCreate({
    where: { venue_id: venueId, phone },
    defaults: { venue_id: venueId, phone, name: name || "Guest", first_order_at: now },
    transaction: t
  });
  await c.update({
    name: name && (!c.name || c.name === "Guest") ? name : c.name,
    orders_count: c.orders_count + 1,
    total_spent: r2(Number(c.total_spent) + Number(total)),
    last_order_at: now
  }, { transaction: t });
}

async function applyPayment(t, order, mode, roomNo) {
  if (!C.PAYMENT_MODES.includes(mode)) throw new AppError("Choose a payment mode", 400);
  if (order.status === "cancelled") throw new AppError("This order is cancelled", 409);
  if (order.payment_status === "paid") throw new AppError("This order is already paid", 409);
  if (mode === "room") {
    const room = String(roomNo || order.room_no || "").trim().slice(0, 20);
    if (!room) throw new AppError("Enter the room number", 400);
    await order.update({ payment_mode: "room", room_no: room, payment_status: "unpaid" }, { transaction: t });
    return;
  }
  await order.update({ payment_mode: mode, payment_status: "paid", amount_paid: order.total, paid_at: new Date() }, { transaction: t });
}

/* ---------------- preview + place ---------------- */
async function preview(ctx, body, mode = "owner") {
  const { venue, settings } = ctx;
  const owner = mode === "owner";
  const b = body || {};
  const orderType = C.ORDER_TYPES.includes(b.order_type) ? b.order_type : "dine_in";
  const lines = await core.resolveLines(venue.id, b.items, { owner });
  const bill = core.computeBill(venue, settings, lines, { orderType, serviceCharge: owner && Boolean(b.service_charge), ...parseDiscount(owner, b) });
  const itemsTotal = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
  return {
    gst_on: bill.gst_on,
    lines: bill.lines.map((l) => ({ name: l.description, quantity: l.quantity, rate: l.rate, amount: l.amount, kind: l.kind || "item" })),
    subtotal: bill.subtotal, discount_amount: bill.discount_amount, taxable_amount: bill.taxable_amount,
    cgst: bill.cgst, sgst: bill.sgst, tax_breakup: bill.tax_breakup, round_off: bill.round_off, total: bill.total,
    min_order: Number(settings.min_order), min_order_ok: !(Number(settings.min_order) > 0) || itemsTotal >= Number(settings.min_order)
  };
}

async function place(ctx, body, mode = "owner") {
  const { venue, settings } = ctx;
  const owner = mode === "owner";
  const b = body || {};

  const orderType = C.ORDER_TYPES.includes(b.order_type) ? b.order_type : null;
  if (!orderType) throw new AppError("Choose dine-in, takeaway or delivery", 400);

  if (!owner) {
    if (!settings.accepting_orders) throw new AppError("We are not taking online orders right now", 403);
    const open = { dine_in: settings.allow_dine_in, takeaway: settings.allow_pickup, delivery: settings.allow_delivery }[orderType];
    if (!open) throw new AppError("This order type is not available right now", 400);
  }

  const lines = await core.resolveLines(venue.id, b.items, { owner });
  const itemsTotal = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
  if (!owner && Number(settings.min_order) > 0 && itemsTotal < Number(settings.min_order)) {
    throw new AppError(`Minimum order is ₹${U.inr(settings.min_order)}`, 400);
  }

  const cust = b.customer || {};
  const name = String(cust.name || "").trim().slice(0, 100);
  const phone = cust.phone ? U.normalizePhone(cust.phone) : null;
  const address = String(cust.address || "").trim().slice(0, 300);
  if (!owner) {
    if (name.length < 2) throw new AppError("Please enter your name", 400);
    if (!phone) throw new AppError("Please enter your mobile number", 400);
    if (orderType === "delivery" && address.length < 6) throw new AppError("Please enter your delivery address", 400);
  }

  let table = null;
  if (orderType === "dine_in") {
    table = String(b.table || "").trim().slice(0, 30) || null;
    if (!owner) {
      const t = table ? await FoodTable.findOne({ where: { venue_id: venue.id, name: table } }) : null;
      if (!t) throw new AppError("Please scan the QR code on your table to order for dine-in", 400);
    }
  }

  let unitId = null;
  if (owner && b.unit_id) {
    const unit = UUID_RE.test(String(b.unit_id)) ? await FoodUnit.findOne({ where: { id: b.unit_id, venue_id: venue.id, is_active: true } }) : null;
    if (!unit) throw new AppError("Stall / outlet not found", 400);
    unitId = unit.id;
  }

  const bill = core.computeBill(venue, settings, lines, { orderType, serviceCharge: owner && Boolean(b.service_charge), ...parseDiscount(owner, b) });
  bill.lines.forEach((l) => { if (l.kind !== "charge" && !l.unit_id && unitId) l.unit_id = unitId; });

  const source = owner ? (C.OWNER_SOURCES.includes(b.source) ? b.source : "pos") : table ? "qr" : "website";
  const commission = core.commissionFor(settings, source, bill.total, owner ? b.commission_percent : undefined);
  const wantCompleted = owner && b.status === "completed";

  return inTx(async (t) => {
    const date = U.todayIST();
    const seq = await core.nextSeq(t, venue.id, "food_orders", "seq");
    const tokenNo = await core.nextSeq(t, venue.id, "food_orders", "token_no", "AND order_date = :d", { d: date });

    const order = await FoodOrder.create({
      venue_id: venue.id, seq, order_no: String(seq).padStart(4, "0"), token_no: tokenNo,
      order_date: date, order_hour: core.hourIST(), order_type: orderType, source,
      table_name: table, unit_id: unitId, customer_name: name || null, customer_phone: phone,
      address: address || null, notes: String(b.notes || "").trim().slice(0, 300) || null,
      items: bill.lines, subtotal: bill.subtotal, discount_amount: bill.discount_amount,
      taxable_amount: bill.taxable_amount, cgst: bill.cgst, sgst: bill.sgst, tax_breakup: bill.tax_breakup,
      round_off: bill.round_off, total: bill.total, status: owner ? "preparing" : "new",
      commission_percent: commission.percent, commission_amount: commission.amount,
      tracking_token: U.token()
    }, { transaction: t });

    if (phone) await touchCustomer(t, venue.id, { phone, name, total: bill.total });
    if (owner && b.pay && b.pay.mode) await applyPayment(t, order, b.pay.mode, b.pay.room_no);
    if (wantCompleted) await completeOrder(t, order);
    return core.presentOrder(order);
  });
}

/* ---------------- reading ---------------- */
async function list(venueId, q = {}) {
  const where = { venue_id: venueId };
  if (q.status === "active") where.status = ["new", "preparing", "ready"];
  else if (C.STATUSES.includes(q.status)) where.status = q.status;
  if (q.date && U.isYmd(q.date)) where.order_date = q.date;
  if (q.payment === "unpaid") where.payment_status = "unpaid";
  if (q.q) {
    const s = `%${U.likeEscape(q.q)}%`;
    where[Op.or] = [{ customer_name: { [Op.iLike]: s } }, { customer_phone: { [Op.iLike]: s } }, { order_no: { [Op.iLike]: s } }];
  }
  const rows = await FoodOrder.findAll({ where, order: [["seq", "DESC"]], limit: 200 });
  return rows.map(core.presentOrder);
}

async function board(venueId) {
  const [active, done] = await Promise.all([
    FoodOrder.findAll({ where: { venue_id: venueId, status: ["new", "preparing", "ready"] }, order: [["seq", "ASC"]], limit: 150 }),
    FoodOrder.findAll({ where: { venue_id: venueId, status: "completed", order_date: U.todayIST() }, order: [["seq", "DESC"]], limit: 15 })
  ]);
  return { active: active.map(core.presentOrder), done: done.map(core.presentOrder) };
}

async function get(venueId, id) {
  const row = UUID_RE.test(String(id)) ? await FoodOrder.findOne({ where: { id, venue_id: venueId } }) : null;
  if (!row) throw new AppError("Order not found", 404);
  return core.presentOrder(row);
}

/* ---------------- changing an order ---------------- */
const lockOrder = async (t, venueId, id) => {
  const row = UUID_RE.test(String(id)) ? await FoodOrder.findOne({ where: { id, venue_id: venueId }, transaction: t, lock: t.LOCK.UPDATE }) : null;
  if (!row) throw new AppError("Order not found", 404);
  return row;
};

const setStatus = (venueId, id, status) => inTx(async (t) => {
  if (!(status in RANK)) throw new AppError("Invalid status", 400);
  const order = await lockOrder(t, venueId, id);
  if (order.status === "cancelled" || order.status === "completed") throw new AppError("This order is already closed", 409);
  if (RANK[status] < RANK[order.status]) throw new AppError("An order can only move forward", 409);
  if (status === "completed") await completeOrder(t, order);
  else await order.update({ status }, { transaction: t });
  return core.presentOrder(order);
});

const pay = (venueId, id, b) => inTx(async (t) => {
  const order = await lockOrder(t, venueId, id);
  await applyPayment(t, order, b && b.mode, b && b.room_no);
  return core.presentOrder(order);
});

const cancel = (venueId, id, reason) => inTx(async (t) => {
  const order = await lockOrder(t, venueId, id);
  if (order.status === "completed") throw new AppError("A completed order cannot be cancelled", 409);
  if (order.status === "cancelled") return core.presentOrder(order);
  await order.update({
    status: "cancelled", cancel_reason: String(reason || "").trim().slice(0, 200) || null,
    payment_status: order.payment_status === "paid" ? "refunded" : order.payment_status
  }, { transaction: t });
  if (order.customer_phone) {
    const c = await FoodCustomer.findOne({ where: { venue_id: venueId, phone: order.customer_phone }, transaction: t });
    if (c) {
      await c.update({
        orders_count: Math.max(c.orders_count - 1, 0),
        total_spent: Math.max(r2(Number(c.total_spent) - Number(order.total)), 0)
      }, { transaction: t });
    }
  }
  return core.presentOrder(order);
});

/* ---------------- customer-facing ---------------- */
async function claimPaid(token) {
  const order = await FoodOrder.findOne({ where: { tracking_token: String(token || "").slice(0, 40) } });
  if (!order) throw new AppError("Order not found", 404);
  if (order.payment_status === "unpaid" && order.payment_mode !== "room" && !(order.meta && order.meta.claimed_at)) {
    await order.update({ meta: { ...(order.meta || {}), claimed_at: new Date().toISOString() } });
  }
  return { ok: true };
}

/* ---------------- hotel: charge-to-room tabs ---------------- */
async function roomTabs(venueId) {
  const rows = await FoodOrder.findAll({
    where: { venue_id: venueId, payment_mode: "room", payment_status: "unpaid", status: { [Op.ne]: "cancelled" } },
    order: [["seq", "ASC"]], limit: 500
  });
  const byRoom = new Map();
  rows.forEach((o) => {
    const e = byRoom.get(o.room_no) || { room: o.room_no, total: 0, orders: [] };
    e.total = r2(e.total + Number(o.total));
    e.orders.push({ id: o.id, order_no: o.order_no, total: Number(o.total), createdAt: o.createdAt });
    byRoom.set(o.room_no, e);
  });
  return [...byRoom.values()];
}

const settleRoom = (venueId, room, mode) => inTx(async (t) => {
  if (!["cash", "upi", "card", "other"].includes(mode)) throw new AppError("Choose how the guest paid", 400);
  const where = { venue_id: venueId, room_no: String(room || ""), payment_mode: "room", payment_status: "unpaid", status: { [Op.ne]: "cancelled" } };
  const [count] = await FoodOrder.update(
    { payment_mode: mode, payment_status: "paid", amount_paid: sequelize.col("total"), paid_at: new Date() },
    { where, transaction: t }
  );
  if (!count) throw new AppError("No open charges for this room", 404);
  return { settled: count };
});

module.exports = { preview, place, list, board, get, setStatus, pay, cancel, claimPaid, roomTabs, settleRoom };