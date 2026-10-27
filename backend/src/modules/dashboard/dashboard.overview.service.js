const { Op, fn, col, QueryTypes } = require("sequelize");
const dayjs = require("dayjs");
const { sequelize, Venue, Booking, Inquiry, Client, Review } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const GC = require("../gym/gym.constants");
const { subtypeFor } = require("../food/food.constants");
const BT = require("../../config/businessTypes");

const num = (v) => Number(v) || 0;

// A failing segment query (missing table, bad migration) must not blank the whole dashboard.
async function safe(promise, fallback) {
  try {
    return await promise;
  } catch (e) {
    console.error("[dashboard.overview]", e.message);
    return fallback;
  }
}

function resolveSegment(venue) {
  const cats = [venue.business_category, ...(venue.secondary_categories || [])].filter(Boolean);
  if (cats.some((c) => GC.GYM_CATEGORY_SLUGS.includes(c))) return "gym";
  if (subtypeFor(venue)) return "food";
  if (typeof BT.getBusinessTypeKey === "function" && cats.some((c) => BT.getBusinessTypeKey(c) === "retail")) return "retail";
  return "bookings";
}

function periods() {
  const today = U.todayIST();
  const monthStart = `${today.slice(0, 8)}01`;
  const keys = Array.from({ length: 6 }, (_, i) => U.addMonths(monthStart, i - 5).slice(0, 7));
  return { today, monthStart, keys, from: `${keys[0]}-01` };
}

function fillTrend(keys, rows) {
  const byMonth = new Map((rows || []).map((r) => [r.month, num(r.total)]));
  return keys.map((k) => ({ month: dayjs(`${k}-01`).format("MMM YYYY"), revenue: byMonth.get(k) || 0 }));
}

function makeQuery(venueId, extra = {}) {
  const { today, monthStart, from } = periods();
  return (sql, replacements = {}, fallback = []) =>
    safe(
      sequelize.query(sql, {
        replacements: { v: venueId, today, monthStart, from, ...extra, ...replacements },
        type: QueryTypes.SELECT
      }),
      fallback
    );
}

/* ───────────── shared ───────────── */

async function reviewStats(venueId) {
  const r = await Review.findOne({
    where: { venue_id: venueId, status: "approved" },
    attributes: [[fn("AVG", col("star_rating")), "avg"], [fn("COUNT", col("id")), "count"]],
    raw: true
  });
  return { avgRating: r?.avg ? +parseFloat(r.avg).toFixed(1) : 0, totalReviews: +r?.count || 0 };
}

async function inquiryStats(venueId) {
  const [total, converted] = await Promise.all([
    Inquiry.count({ where: { venue_id: venueId } }),
    Inquiry.count({ where: { venue_id: venueId, status: "confirmed" } })
  ]);
  return { total, converted, rate: total > 0 ? +((converted / total) * 100).toFixed(2) : 0 };
}

/* ───────────── segments ───────────── */

// Events, studios, clinics and every other appointment style business: same numbers as /analytics/owner.
async function bookingsBlock(venueId, inq) {
  const monthStart = dayjs().startOf("month").toDate();
  const monthWhere = { venue_id: venueId, created_at: { [Op.gte]: monthStart } };

  const trendPromises = [5, 4, 3, 2, 1, 0].map((i) => {
    const s = dayjs().subtract(i, "month").startOf("month");
    const e = dayjs().subtract(i, "month").endOf("month");
    return Booking.sum("amount_received", {
      where: { venue_id: venueId, created_at: { [Op.between]: [s.toDate(), e.toDate()] } }
    }).then((v) => ({ month: s.format("MMM YYYY"), revenue: num(v) }));
  });

  const [monthlyBookings, monthlyRevenue, pending, lifetime, lifetimeCount, clients, trend] = await Promise.all([
    Booking.count({ where: monthWhere }),
    Booking.sum("amount_received", { where: monthWhere }),
    Booking.sum("balance_pending", { where: { venue_id: venueId } }),
    Booking.sum("amount_received", { where: { venue_id: venueId } }),
    Booking.count({ where: { venue_id: venueId } }),
    Client.count({ where: { venue_id: venueId } }),
    Promise.all(trendPromises)
  ]);

  const avg = lifetimeCount > 0 ? Math.round(num(lifetime) / lifetimeCount) : 0;

  return {
    labels: { revenue: "This month's revenue", empty: "Your first booking will show up here", pulseTitle: null },
    heroStats: [
      { key: "bookings", label: "Bookings", value: monthlyBookings, kind: "number" },
      { key: "conversion", label: "Inquiry conversion", value: inq.rate, kind: "percent" },
      { key: "pending", label: "Pending payments", value: num(pending), kind: "currency" }
    ],
    tiles: [
      { key: "lifetime", icon: "wallet", tone: "violet", label: "Lifetime revenue", kind: "currency", value: num(lifetime) },
      { key: "clients", icon: "users", tone: "sky", label: "Total clients", kind: "number", value: clients },
      { key: "avg", icon: "repeat", tone: "emerald", label: "Avg booking value", kind: "currency", value: avg }
    ],
    pulse: null,
    legacy: {
      monthlyBookings,
      monthlyRevenue: num(monthlyRevenue),
      totalPendingPayments: num(pending),
      revenueTrend: trend,
      totalRevenueAllTime: num(lifetime),
      totalClients: clients,
      avgBookingValue: avg
    }
  };
}

async function gymBlock(venueId) {
  const { today, keys } = periods();
  const q = makeQuery(venueId, {
    in7: U.addDays(today, GC.EXPIRING_DAYS),
    from30: U.addDays(today, -30),
    yesterday: U.addDays(today, -1)
  });

  const [trendRows, [life = {}], [m = {}], [rr = {}], [leads = {}]] = await Promise.all([
    q(
      `SELECT to_char(paid_on, 'YYYY-MM') AS month, SUM(amount)::float AS total
       FROM gym_payments WHERE venue_id = :v AND status = 'paid' AND paid_on >= :from GROUP BY 1`
    ),
    q(`SELECT COALESCE(SUM(amount), 0)::float AS total, COUNT(*)::int AS n FROM gym_payments WHERE venue_id = :v AND status = 'paid'`),
    q(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status NOT IN ('frozen','cancelled') AND end_date >= :today)::int AS active,
         COUNT(*) FILTER (WHERE status NOT IN ('frozen','cancelled') AND end_date BETWEEN :today AND :in7)::int AS expiring,
         COUNT(*) FILTER (WHERE status NOT IN ('frozen','cancelled') AND end_date < :today)::int AS expired,
         COUNT(*) FILTER (WHERE balance_due > 0)::int AS dues_count,
         COALESCE(SUM(balance_due), 0)::float AS dues_total,
         COUNT(*) FILTER (WHERE joined_on >= :monthStart)::int AS new_this_month
       FROM gym_members WHERE venue_id = :v AND is_archived = false`
    ),
    q(
      `SELECT COUNT(*)::int AS due,
         COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM gym_memberships n
           WHERE n.member_id = ms.member_id AND n.status = 'active' AND n.id <> ms.id AND n.start_date > ms.start_date))::int AS renewed
       FROM gym_memberships ms
       WHERE ms.venue_id = :v AND ms.status = 'active' AND ms.end_date BETWEEN :from30 AND :yesterday`
    ),
    q(`SELECT COUNT(*)::int AS n FROM gym_leads WHERE venue_id = :v AND status = 'new'`)
  ]);

  const revenueTrend = fillTrend(keys, trendRows);
  const renewalRate = num(rr.due) > 0 ? Math.round((num(rr.renewed) / num(rr.due)) * 100) : null;
  const avgPerPayment = num(life.n) > 0 ? Math.round(num(life.total) / num(life.n)) : 0;

  return {
    labels: { revenue: "This month's collection", empty: "Your first payment will show up here", pulseTitle: "Members at a glance" },
    heroStats: [
      { key: "active", label: "Active members", value: num(m.active), kind: "number" },
      { key: "renewal", label: "Renewal rate", value: renewalRate, kind: "percent" },
      { key: "leads", label: "New enquiries", value: num(leads.n), kind: "number" }
    ],
    tiles: [
      { key: "lifetime", icon: "wallet", tone: "violet", label: "Lifetime collection", kind: "currency", value: num(life.total) },
      { key: "members", icon: "users", tone: "emerald", label: "Active members", kind: "number", value: num(m.active), sublabel: `${num(m.new_this_month)} joined this month` },
      { key: "dues", icon: "clock", tone: "sky", label: "Pending dues", kind: "currency", value: num(m.dues_total), sublabel: `${num(m.dues_count)} members` }
    ],
    pulse: [
      { key: "expiring", label: "Expiring in 7 days", hint: "Memberships ending this week", value: num(m.expiring), kind: "number", tone: "amber", to: "/dashboard/gym/members" },
      { key: "expired", label: "Expired", hint: "Waiting for renewal", value: num(m.expired), kind: "number", tone: "red", to: "/dashboard/gym/members" },
      { key: "dues", label: "Pending dues", hint: `${num(m.dues_count)} members`, value: num(m.dues_total), kind: "currency", tone: "violet", to: "/dashboard/gym/members" },
      { key: "leads", label: "New enquiries", hint: "Not contacted yet", value: num(leads.n), kind: "number", tone: "sky", to: "/dashboard/gym/leads" }
    ],
    legacy: {
      monthlyBookings: num(m.new_this_month),
      monthlyRevenue: revenueTrend[5].revenue,
      totalPendingPayments: num(m.dues_total),
      revenueTrend,
      totalRevenueAllTime: num(life.total),
      totalClients: num(m.total),
      avgBookingValue: avgPerPayment
    }
  };
}

async function foodBlock(venueId) {
  const { today, keys } = periods();
  const q = makeQuery(venueId);

  const [trendRows, [life = {}], [live = {}], [cust = {}], [stock = {}]] = await Promise.all([
    q(
      `SELECT to_char(order_date, 'YYYY-MM') AS month, SUM(total)::float AS total, COUNT(*)::int AS n
       FROM food_orders WHERE venue_id = :v AND status <> 'cancelled' AND order_date >= :from GROUP BY 1`
    ),
    q(
      `SELECT COALESCE(SUM(total), 0)::float AS total, COUNT(*)::int AS n,
         COALESCE(SUM(total) FILTER (WHERE payment_status = 'unpaid'), 0)::float AS unpaid,
         COUNT(*) FILTER (WHERE order_date = :today)::int AS today_orders,
         COALESCE(SUM(total) FILTER (WHERE order_date = :today), 0)::float AS today_sales
       FROM food_orders WHERE venue_id = :v AND status <> 'cancelled'`
    ),
    q(
      `SELECT COUNT(*) FILTER (WHERE status = 'new')::int AS fresh,
         COUNT(*) FILTER (WHERE status = 'preparing')::int AS preparing,
         COUNT(*) FILTER (WHERE status = 'ready')::int AS ready
       FROM food_orders WHERE venue_id = :v`
    ),
    q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE orders_count >= 2)::int AS repeat FROM food_customers WHERE venue_id = :v`),
    q(
      `SELECT COUNT(*)::int AS low FROM food_ingredients
       WHERE venue_id = :v AND is_active = true AND reorder_level > 0 AND stock_qty <= reorder_level`
    )
  ]);

  const revenueTrend = fillTrend(keys, trendRows);
  const thisKey = keys[5];
  const monthOrders = num((trendRows || []).find((r) => r.month === thisKey)?.n);
  const repeatPct = num(cust.total) > 0 ? Math.round((num(cust.repeat) / num(cust.total)) * 100) : 0;
  const avgOrder = num(life.n) > 0 ? Math.round(num(life.total) / num(life.n)) : 0;
  const liveTotal = num(live.fresh) + num(live.preparing) + num(live.ready);

  return {
    labels: { revenue: "This month's sales", empty: "Your first order will show up here", pulseTitle: "Kitchen at a glance" },
    heroStats: [
      { key: "orders", label: "Orders", value: monthOrders, kind: "number" },
      { key: "repeat", label: "Repeat customers", value: repeatPct, kind: "percent" },
      { key: "unpaid", label: "Unpaid orders", value: num(life.unpaid), kind: "currency" }
    ],
    tiles: [
      { key: "lifetime", icon: "wallet", tone: "violet", label: "Lifetime sales", kind: "currency", value: num(life.total) },
      { key: "customers", icon: "users", tone: "sky", label: "Customers", kind: "number", value: num(cust.total) },
      { key: "avg", icon: "repeat", tone: "emerald", label: "Avg order value", kind: "currency", value: avgOrder }
    ],
    pulse: [
      { key: "live", label: "Live orders", hint: `${num(live.fresh)} new, ${num(live.preparing)} preparing, ${num(live.ready)} ready`, value: liveTotal, kind: "number", tone: "amber", to: "/dashboard/food" },
      { key: "today", label: "Today's sales", hint: `${num(life.today_orders)} orders today`, value: num(life.today_sales), kind: "currency", tone: "emerald", to: "/dashboard/food" },
      { key: "unpaid", label: "Unpaid orders", hint: "Payment not received", value: num(life.unpaid), kind: "currency", tone: "red", to: "/dashboard/food" },
      { key: "stock", label: "Low stock items", hint: "At or below reorder level", value: num(stock.low), kind: "number", tone: "violet", to: "/dashboard/food" }
    ],
    legacy: {
      monthlyBookings: monthOrders,
      monthlyRevenue: revenueTrend[5].revenue,
      totalPendingPayments: num(life.unpaid),
      revenueTrend,
      totalRevenueAllTime: num(life.total),
      totalClients: num(cust.total),
      avgBookingValue: avgOrder
    }
  };
}

async function retailBlock(venueId) {
  const { keys } = periods();
  const q = makeQuery(venueId);

  const [trendRows, [life = {}], clients] = await Promise.all([
    q(
      `SELECT to_char(created_at, 'YYYY-MM') AS month, SUM(amount_paid)::float AS total,
         COUNT(*) FILTER (WHERE status <> 'draft')::int AS n
       FROM invoices WHERE venue_id = :v AND type = 'invoice' AND created_at >= :from GROUP BY 1`
    ),
    q(
      `SELECT COALESCE(SUM(amount_paid), 0)::float AS total,
         COUNT(*) FILTER (WHERE status <> 'draft')::int AS n,
         COALESCE(SUM(balance_due) FILTER (WHERE status <> 'draft'), 0)::float AS due,
         COUNT(*) FILTER (WHERE status <> 'draft' AND balance_due > 0)::int AS due_n,
         COUNT(*) FILTER (WHERE status <> 'draft' AND created_at >= :today)::int AS today_n
       FROM invoices WHERE venue_id = :v AND type = 'invoice'`
    ),
    safe(Client.count({ where: { venue_id: venueId } }), 0)
  ]);

  const revenueTrend = fillTrend(keys, trendRows);
  const monthBills = num((trendRows || []).find((r) => r.month === keys[5])?.n);
  const avgBill = num(life.n) > 0 ? Math.round(num(life.total) / num(life.n)) : 0;

  return {
    labels: { revenue: "This month's sales", empty: "Your first bill will show up here", pulseTitle: "Billing at a glance" },
    heroStats: [
      { key: "bills", label: "Bills", value: monthBills, kind: "number" },
      { key: "customers", label: "Customers", value: clients, kind: "number" },
      { key: "pending", label: "Pending payments", value: num(life.due), kind: "currency" }
    ],
    tiles: [
      { key: "lifetime", icon: "wallet", tone: "violet", label: "Lifetime sales", kind: "currency", value: num(life.total) },
      { key: "customers", icon: "users", tone: "sky", label: "Customers", kind: "number", value: clients },
      { key: "avg", icon: "repeat", tone: "emerald", label: "Avg bill value", kind: "currency", value: avgBill }
    ],
    pulse: [
      { key: "unpaid", label: "Unpaid bills", hint: `${num(life.due_n)} bills`, value: num(life.due), kind: "currency", tone: "red", to: "/dashboard/billing" },
      { key: "today", label: "Bills today", hint: "Created since midnight", value: num(life.today_n), kind: "number", tone: "emerald", to: "/dashboard/billing" }
    ],
    legacy: {
      monthlyBookings: monthBills,
      monthlyRevenue: revenueTrend[5].revenue,
      totalPendingPayments: num(life.due),
      revenueTrend,
      totalRevenueAllTime: num(life.total),
      totalClients: clients,
      avgBookingValue: avgBill
    }
  };
}

const BLOCKS = { gym: gymBlock, food: foodBlock, retail: retailBlock };

/* ───────────── handler ───────────── */

async function getOwnerOverview(req, res, next) {
  try {
    const venue = await Venue.findByPk(req.params.venueId, {
      attributes: ["id", "business_category", "secondary_categories"]
    });
    if (!venue) throw new AppError("Venue not found", 404);

    const segment = resolveSegment(venue);

    const [reviews, inq] = await Promise.all([
      safe(reviewStats(venue.id), { avgRating: 0, totalReviews: 0 }),
      safe(inquiryStats(venue.id), { total: 0, converted: 0, rate: 0 })
    ]);

    const block = segment === "bookings" ? await bookingsBlock(venue.id, inq) : await BLOCKS[segment](venue.id);

    const tiles = [
      ...block.tiles,
      {
        key: "rating",
        icon: "star",
        tone: "amber",
        label: "Average rating",
        kind: "rating",
        value: reviews.avgRating ? `${reviews.avgRating} ★` : "–",
        sublabel: `${reviews.totalReviews} reviews`
      }
    ];

    res.json({
      success: true,
      data: {
        segment,
        labels: block.labels,
        heroStats: block.heroStats,
        tiles,
        pulse: block.pulse,
        ...block.legacy,
        totalInquiries: inq.total,
        convertedInquiries: inq.converted,
        conversionRate: inq.rate,
        avgRating: reviews.avgRating,
        totalReviews: reviews.totalReviews
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getOwnerOverview };