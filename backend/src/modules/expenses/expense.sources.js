// Reads money that already exists in the app (fees, sales, orders, invoices, bookings, payroll).
// READ-ONLY: nothing here writes to or changes any existing module. Every query is isolated, so one
// failing source (missing table, bad data) never breaks the Expenses page.
const { QueryTypes } = require("sequelize");
const { getSequelize } = require("../../utils/db");
const CFG = require("../../config/expenseCategories");

// Same segment logic as the owner dashboard (dashboard.overview.service.js), so numbers match.
// Returns: gym | academy | studio | library | food | retail | general
function resolveKind(venue) {
  const VS = require("../../config/vendorSegments");
  const GC = require("../gym/gym.constants");
  const BT = require("../../config/businessTypes");
  const { subtypeFor } = require("../food/food.constants");

  const cats = [venue.business_category, ...(venue.secondary_categories || [])].filter(Boolean);
  if (cats.some((c) => GC.GYM_CATEGORY_SLUGS.includes(c)) || VS.isGymEngine(cats)) return VS.gymVariantFor(venue.business_category);
  if (cats.includes("study-library") || VS.categoriesInSegment(cats, "library")) return "library";
  if (subtypeFor(venue)) return "food";
  if (typeof BT.getBusinessTypeKey === "function" && cats.some((c) => BT.getBusinessTypeKey(c) === "retail")) return "retail";
  return "general";
}

const IST = "Asia/Kolkata";
// timestamptz column -> IST calendar-day window, written so the (venue, created_at) index can be used.
const tsRange = (c) => `${c} >= (:from)::timestamp AT TIME ZONE '${IST}' AND ${c} < ((:to)::date + 1)::timestamp AT TIME ZONE '${IST}'`;
const tsMonth = (c) => `to_char(${c} AT TIME ZONE '${IST}', 'YYYY-MM')`;

const SOURCES = {
  gym: {
    income: [
      {
        key: "membership_fees",
        sql: `SELECT to_char(paid_on, 'YYYY-MM') AS month, SUM(amount)::float AS total FROM gym_payments
              WHERE venue_id = :v AND status = 'paid' AND paid_on BETWEEN :from AND :to GROUP BY 1`
      },
      {
        key: "store_sales",
        sql: `SELECT to_char(sold_on, 'YYYY-MM') AS month, SUM(amount_paid)::float AS total FROM gym_sales
              WHERE venue_id = :v AND status <> 'cancelled' AND sold_on BETWEEN :from AND :to GROUP BY 1`
      }
    ],
    expense: [
      {
        key: "staff_payroll",
        sql: `SELECT to_char(paid_on, 'YYYY-MM') AS month, SUM(amount)::float AS total FROM gym_staff_payments
              WHERE venue_id = :v AND status = 'paid' AND paid_on BETWEEN :from AND :to GROUP BY 1`
      }
    ]
  },
  library: {
    income: [
      {
        key: "student_fees",
        sql: `SELECT to_char(paid_on, 'YYYY-MM') AS month, SUM(amount)::float AS total FROM lib_payments
              WHERE venue_id = :v AND status = 'paid' AND paid_on BETWEEN :from AND :to GROUP BY 1`
      }
    ],
    expense: []
  },
  food: {
    income: [
      {
        key: "food_sales",
        sql: `SELECT to_char(order_date, 'YYYY-MM') AS month, SUM(total)::float AS total FROM food_orders
              WHERE venue_id = :v AND status <> 'cancelled' AND order_date BETWEEN :from AND :to GROUP BY 1`
      }
    ],
    expense: [
      {
        key: "aggregator_commission",
        sql: `SELECT to_char(order_date, 'YYYY-MM') AS month, SUM(commission_amount)::float AS total FROM food_orders
              WHERE venue_id = :v AND status <> 'cancelled' AND order_date BETWEEN :from AND :to GROUP BY 1`
      }
    ]
  },
  retail: {
    income: [
      {
        key: "shop_sales",
        sql: `SELECT ${tsMonth("created_at")} AS month, SUM(amount_paid)::float AS total FROM invoices
              WHERE venue_id = :v AND type = 'invoice' AND ${tsRange("created_at")} GROUP BY 1`
      }
    ],
    expense: [
      {
        key: "stock_purchases",
        sql: `SELECT to_char(bill_date, 'YYYY-MM') AS month, SUM(amount_paid)::float AS total FROM inventory_purchases
              WHERE venue_id = :v AND status = 'active' AND bill_date BETWEEN :from AND :to GROUP BY 1`
      }
    ]
  },
  bookings: {
    income: [
      {
        key: "booking_payments",
        sql: `SELECT ${tsMonth("created_at")} AS month, SUM(amount_received)::float AS total FROM bookings
              WHERE venue_id = :v AND ${tsRange("created_at")} GROUP BY 1`
      }
    ],
    expense: []
  }
};

const SOURCE_OF = { gym: "gym", academy: "gym", studio: "gym", library: "library", food: "food", retail: "retail", general: "bookings" };
const setFor = (kind) => SOURCES[SOURCE_OF[kind] || "bookings"];

async function run(venueId, src, from, to) {
  try {
    const rows = await getSequelize().query(src.sql, {
      replacements: { v: venueId, from, to },
      type: QueryTypes.SELECT
    });
    return rows.map((r) => ({ month: r.month, key: src.key, total: Number(r.total) || 0 }));
  } catch (e) {
    console.error(`[expenses] auto source "${src.key}" failed:`, e.message);
    return [];
  }
}

// -> { income: [{ month, key, total }], expense: [{ month, key, total }] }   (from/to = YYYY-MM-DD, inclusive)
async function autoTotals(venue, kind, from, to) {
  const set = setFor(kind);
  const [income, expense] = await Promise.all([
    Promise.all(set.income.map((s) => run(venue.id, s, from, to))),
    Promise.all(set.expense.map((s) => run(venue.id, s, from, to)))
  ]);
  return { income: income.flat(), expense: expense.flat() };
}

// For the UI: what is already tracked automatically for this vendor.
function describeAuto(kind) {
  const set = setFor(kind);
  return {
    income: set.income.map((s) => ({ key: s.key, label: CFG.AUTO_INCOME[s.key] || s.key })),
    expense: set.expense.map((s) => ({ key: s.key, label: (CFG.AUTO_EXPENSE[s.key] || {}).label || s.key }))
  };
}

module.exports = { resolveKind, autoTotals, describeAuto };