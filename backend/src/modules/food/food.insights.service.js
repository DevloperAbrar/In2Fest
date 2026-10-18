const { Op } = require("sequelize");
const { FoodOrder, FoodCustomer, FoodIngredient, FoodUnit } = require("./food.models");
const { AppError } = require("../../middleware/error.middleware");
const { r2 } = require("../../utils/taxEngine");
const U = require("../gym/gym.utils");
const C = require("./food.constants");
const core = require("./food.core");

const n = (v) => Number(v) || 0;
const sumBy = (rows, f) => r2(rows.reduce((s, x) => s + n(f(x)), 0));
const DAY = 86400000;

function range(q) {
  const today = U.todayIST();
  let to = U.isYmd(q.to) ? q.to : today;
  let from = U.isYmd(q.from) ? q.from : U.addDays(to, -6);
  if (from > to) [from, to] = [to, from];
  if (U.diffDays(from, to) > 92) throw new AppError("Choose a range of up to 92 days", 400);
  return { from, to };
}

function tallyItems(rows) {
  const tally = new Map();
  rows.forEach((o) => (o.items || []).forEach((l) => {
    if (l.kind === "charge") return;
    const key = l.description || l.name;
    const e = tally.get(key) || { name: key, qty: 0, revenue: 0 };
    e.qty += n(l.quantity);
    e.revenue = r2(e.revenue + n(l.amount));
    tally.set(key, e);
  }));
  return [...tally.values()].sort((a, b) => b.qty - a.qty);
}

function groupBy(rows, keyFn) {
  const m = new Map();
  rows.forEach((o) => {
    const k = keyFn(o);
    const e = m.get(k) || { key: k, orders: 0, sales: 0 };
    e.orders += 1;
    e.sales = r2(e.sales + n(o.total));
    m.set(k, e);
  });
  return [...m.values()];
}

/* ---------------- dashboard ---------------- */
async function dashboard(venue, settings) {
  const vid = venue.id;
  const today = U.todayIST();
  const from30 = U.addDays(today, -29);
  const from7 = U.addDays(today, -6);
  const live = { [Op.ne]: "cancelled" };

  const [light, itemRows, qNew, qPrep, qReady, custTotal, custRepeat, custNew, ings] = await Promise.all([
    FoodOrder.findAll({
      where: { venue_id: vid, order_date: { [Op.gte]: from30 }, status: live },
      attributes: ["order_date", "order_hour", "source", "total", "payment_status", "payment_mode", "commission_amount"], raw: true, limit: 20000
    }),
    FoodOrder.findAll({ where: { venue_id: vid, order_date: { [Op.gte]: from7 }, status: live }, attributes: ["items"], raw: true, limit: 6000 }),
    FoodOrder.count({ where: { venue_id: vid, status: "new" } }),
    FoodOrder.count({ where: { venue_id: vid, status: "preparing" } }),
    FoodOrder.count({ where: { venue_id: vid, status: "ready" } }),
    FoodCustomer.count({ where: { venue_id: vid } }),
    FoodCustomer.count({ where: { venue_id: vid, orders_count: { [Op.gte]: 2 } } }),
    FoodCustomer.count({ where: { venue_id: vid, first_order_at: { [Op.gte]: new Date(Date.now() - 7 * DAY) } } }),
    FoodIngredient.findAll({ where: { venue_id: vid, is_active: true, reorder_level: { [Op.gt]: 0 } } })
  ]);

  const todayRows = light.filter((o) => o.order_date === today);
  const week = light.filter((o) => o.order_date >= from7);

  const series = [];
  for (let i = 6; i >= 0; i--) {
    const d = U.addDays(today, -i);
    const rows = week.filter((o) => o.order_date === d);
    series.push({ date: d, label: U.fmtDate(d).slice(0, 6), orders: rows.length, sales: sumBy(rows, (o) => o.total) });
  }

  const hours = new Map();
  week.forEach((o) => hours.set(o.order_hour, (hours.get(o.order_hour) || 0) + 1));
  const peak = [...hours.entries()].sort((a, b) => b[1] - a[1])[0];

  const direct = light.filter((o) => ["website", "qr"].includes(o.source));
  const aggr = light.filter((o) => core.AGGREGATORS.includes(o.source));
  const pctC = n(settings.aggregator_commission);
  const directSales = sumBy(direct, (o) => o.total);

  return {
    today: {
      orders: todayRows.length,
      sales: sumBy(todayRows, (o) => o.total),
      avg_order: todayRows.length ? r2(sumBy(todayRows, (o) => o.total) / todayRows.length) : 0,
      unpaid: sumBy(todayRows.filter((o) => o.payment_status === "unpaid"), (o) => o.total)
    },
    live: { new: qNew, preparing: qPrep, ready: qReady },
    series,
    peak_hour: peak ? { hour: peak[0], orders: peak[1] } : null,
    sources: groupBy(week, (o) => o.source).map((e) => ({ source: e.key, orders: e.orders, sales: e.sales })),
    top_items: tallyItems(itemRows).slice(0, 8),
    aggregator: {
      percent: pctC,
      direct_orders_30d: direct.length,
      direct_sales_30d: directSales,
      saved_30d: r2((directSales * pctC) / 100),
      aggregator_orders_30d: aggr.length,
      aggregator_sales_30d: sumBy(aggr, (o) => o.total),
      commission_paid_30d: sumBy(aggr, (o) => o.commission_amount)
    },
    customers: { total: custTotal, repeat_percent: custTotal ? Math.round((custRepeat / custTotal) * 100) : 0, new_7d: custNew },
    low_stock: ings.filter((i) => n(i.stock_qty) <= n(i.reorder_level)).map((i) => ({ id: i.id, name: i.name, stock_qty: n(i.stock_qty), unit: i.unit }))
  };
}

/* ---------------- reports ---------------- */
async function loadRange(venueId, q) {
  const { from, to } = range(q);
  const where = { venue_id: venueId, order_date: { [Op.between]: [from, to] } };
  const rows = await FoodOrder.findAll({ where: { ...where, status: { [Op.ne]: "cancelled" } }, order: [["seq", "ASC"]], raw: true, limit: 20000 });
  return { from, to, rows, where };
}

async function reports(venue, settings, q = {}) {
  const { from, to } = range(q);
  const where = { venue_id: venue.id, order_date: { [Op.between]: [from, to] } };
  const [rows, cancelled, units] = await Promise.all([
    FoodOrder.findAll({ where: { ...where, status: { [Op.ne]: "cancelled" } }, order: [["seq", "ASC"]], raw: true, limit: 20000 }),
    FoodOrder.findAll({ where: { ...where, status: "cancelled" }, attributes: ["total"], raw: true }),
    FoodUnit.findAll({ where: { venue_id: venue.id } })
  ]);

  const gst = new Map();
  rows.forEach((o) => (o.tax_breakup || []).forEach((b) => {
    const e = gst.get(b.rate) || { rate: b.rate, taxable: 0, cgst: 0, sgst: 0 };
    e.taxable = r2(e.taxable + n(b.taxable));
    e.cgst = r2(e.cgst + n(b.cgst));
    e.sgst = r2(e.sgst + n(b.sgst));
    gst.set(b.rate, e);
  }));

  const payments = new Map();
  rows.filter((o) => o.payment_status === "paid").forEach((o) => {
    const e = payments.get(o.payment_mode) || { mode: o.payment_mode, orders: 0, amount: 0 };
    e.orders += 1;
    e.amount = r2(e.amount + n(o.total));
    payments.set(o.payment_mode, e);
  });

  // Stall / outlet settlement from line-level taxable value
  const unitRows = new Map();
  if (units.length) {
    rows.forEach((o) => (o.items || []).forEach((l) => {
      if (l.kind === "charge") return;
      const uid = l.unit_id || o.unit_id || "none";
      const e = unitRows.get(uid) || { taxable: 0, tax: 0, orders: new Set() };
      e.taxable = r2(e.taxable + n(l.taxable_value ?? l.amount));
      e.tax = r2(e.tax + n(l.tax_amount));
      e.orders.add(o.id);
      unitRows.set(uid, e);
    }));
  }
  const unitReport = [...unitRows.entries()].map(([uid, e]) => {
    const u = units.find((x) => x.id === uid);
    const share = u ? n(u.share_percent) : 0;
    return {
      unit_id: uid, name: u ? u.name : "Not assigned", orders: e.orders.size, taxable: e.taxable, gross: r2(e.taxable + e.tax),
      share_percent: share, share_amount: r2((e.taxable * share) / 100)
    };
  }).sort((a, b) => b.taxable - a.taxable);

  const sales = sumBy(rows, (o) => o.total);
  return {
    range: { from, to },
    summary: {
      orders: rows.length, sales, taxable: sumBy(rows, (o) => o.taxable_amount),
      tax: sumBy(rows, (o) => n(o.cgst) + n(o.sgst)), discount: sumBy(rows, (o) => o.discount_amount),
      avg_order: rows.length ? r2(sales / rows.length) : 0,
      cancelled: cancelled.length, cancelled_amount: sumBy(cancelled, (o) => o.total),
      commission_paid: sumBy(rows, (o) => o.commission_amount),
      unpaid: sumBy(rows.filter((o) => o.payment_status === "unpaid"), (o) => o.total)
    },
    by_day: groupBy(rows, (o) => o.order_date).map((e) => ({ date: e.key, orders: e.orders, sales: e.sales })),
    by_source: groupBy(rows, (o) => o.source).map((e) => ({ source: e.key, orders: e.orders, sales: e.sales })),
    by_type: groupBy(rows, (o) => o.order_type).map((e) => ({ type: e.key, orders: e.orders, sales: e.sales })),
    by_payment: [...payments.values()],
    gst: [...gst.values()].sort((a, b) => a.rate - b.rate),
    top_items: tallyItems(rows).slice(0, 15),
    units: unitReport
  };
}

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function exportCsv(venue, q = {}) {
  const { rows } = await loadRange(venue.id, q);
  const head = ["Date", "Order no", "Type", "Source", "Customer", "Phone", "Items", "Subtotal", "Discount", "CGST", "SGST", "Round off", "Total", "Payment", "Status"];
  const body = rows.map((o) => [
    o.order_date, o.order_no, o.order_type, o.source, o.customer_name || "", o.customer_phone || "",
    (o.items || []).filter((l) => l.kind !== "charge").map((l) => `${l.quantity} x ${l.description}`).join("; "),
    o.subtotal, o.discount_amount, o.cgst, o.sgst, o.round_off, o.total,
    o.payment_status === "paid" ? o.payment_mode : o.payment_status, o.status
  ].map(csvCell).join(","));
  return `\uFEFF${[head.join(","), ...body].join("\n")}`;
}

/* ---------------- customers ---------------- */
const istDate = (d) => (d ? new Date(new Date(d).getTime() + 330 * 60000).toISOString().slice(0, 10) : null);

async function customers(venueId, q = {}) {
  const where = { venue_id: venueId };
  if (q.q) {
    const s = `%${U.likeEscape(q.q)}%`;
    where[Op.or] = [{ name: { [Op.iLike]: s } }, { phone: { [Op.iLike]: s } }];
  }
  const today = U.todayIST();
  const rows = await FoodCustomer.findAll({ where, order: [["last_order_at", "DESC"]], limit: 500 });
  const out = rows.map((c) => {
    const last = istDate(c.last_order_at);
    const days = last ? U.diffDays(last, today) : null;
    let segment = c.orders_count >= 3 ? "regular" : c.orders_count === 1 ? "new" : "returning";
    if (days !== null && days > 30 && c.orders_count >= 2) segment = "lapsed";
    return { id: c.id, name: c.name, phone: c.phone, orders_count: c.orders_count, total_spent: n(c.total_spent), last_order_on: last, days_since: days, segment };
  });
  return ["regular", "lapsed", "new", "returning"].includes(q.segment) ? out.filter((c) => c.segment === q.segment) : out;
}

async function composeMessage(ctx, customerId, type) {
  const c = core.UUID_RE.test(String(customerId)) ? await FoodCustomer.findOne({ where: { id: customerId, venue_id: ctx.venue.id } }) : null;
  if (!c) throw new AppError("Customer not found", 404);
  const tpl = (ctx.settings.message_templates || {})[type] || C.DEFAULT_MESSAGES[type];
  if (!tpl) throw new AppError("Unknown message type", 400);
  const vars = { name: U.firstName(c.name), restaurant: ctx.venue.hall_name, link: core.siteUrl(ctx.venue) };
  const text = tpl.replace(/{{\s*(\w+)\s*}}/g, (m, k) => vars[k] ?? "");
  return { text, phone: c.phone };
}

module.exports = { dashboard, reports, exportCsv, customers, composeMessage };