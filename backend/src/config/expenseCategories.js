// Single source of truth for expense / income categories, cost groups and guide thresholds.
// Add or rename a DEFAULT category here and every vendor receives it on their next visit
// (expense.service.js -> ensureCategories only inserts what a vendor is missing; it never deletes).
//
// cost_group: cogs (direct / variable cost) | people | fixed | growth | operations | capex (one-time) | other

const COST_GROUPS = ["cogs", "people", "fixed", "growth", "operations", "capex", "other"];
const PAYMENT_MODES = ["cash", "upi", "card", "bank_transfer", "other"];
const PALETTE = ["#6366f1", "#0ea5e9", "#f59e0b", "#ec4899", "#14b8a6", "#22c55e", "#f97316", "#8b5cf6", "#ef4444", "#64748b"];

const cat = (slug, label, color, cost_group = "operations") => ({ slug, label, color, cost_group });

const COMMON_EXPENSE = [
  cat("rent", "Rent", "#6366f1", "fixed"),
  cat("salaries", "Salaries & wages", "#0ea5e9", "people"),
  cat("electricity", "Electricity & water", "#f59e0b", "fixed"),
  cat("internet_software", "Internet & software", "#8b5cf6", "fixed"),
  cat("marketing", "Marketing & ads", "#ec4899", "growth"),
  cat("repairs", "Repairs & maintenance", "#14b8a6", "operations"),
  cat("cleaning", "Cleaning & supplies", "#22c55e", "operations"),
  cat("licences_insurance", "Licences, tax & insurance", "#64748b", "fixed"),
  cat("travel", "Travel & transport", "#f97316", "operations")
];
const OTHER_EXPENSE = cat("other", "Other", "#94a3b8", "other");

// Shop stock purchases are NOT listed for retail: they are tracked automatically from Inventory.
const EXTRA_EXPENSE = {
  gym: [cat("equipment", "Equipment purchase", "#ef4444", "capex"), cat("store_stock", "Store stock purchase", "#a855f7", "cogs")],
  academy: [cat("equipment", "Sports equipment", "#ef4444", "capex"), cat("kits_uniforms", "Kits & uniforms", "#a855f7", "cogs"), cat("tournaments", "Tournaments & events", "#06b6d4", "operations")],
  studio: [cat("equipment", "Instruments & equipment", "#ef4444", "capex"), cat("costumes_props", "Costumes & props", "#a855f7", "operations"), cat("shows_events", "Shows & events", "#06b6d4", "operations")],
  library: [cat("furniture", "Furniture & fittings", "#ef4444", "capex"), cat("books_subscriptions", "Books & subscriptions", "#a855f7", "operations")],
  food: [cat("raw_material", "Raw material & ingredients", "#ef4444", "cogs"), cat("packaging", "Packaging", "#a855f7", "cogs"), cat("gas_fuel", "Gas & fuel", "#fb923c", "operations"), cat("kitchen_equipment", "Kitchen equipment", "#06b6d4", "capex")],
  retail: [cat("packaging", "Packaging", "#a855f7", "cogs"), cat("shop_fixtures", "Shop fixtures & equipment", "#ef4444", "capex")],
  general: [cat("vendor_payments", "Vendor & sub-contractor payments", "#ef4444", "cogs"), cat("materials", "Materials & consumables", "#a855f7", "cogs"), cat("equipment", "Equipment", "#06b6d4", "capex"), cat("printing", "Printing & stationery", "#fb923c", "operations")]
};

const LABEL_OVERRIDES = {
  academy: { rent: "Ground / court rent", salaries: "Coaches & staff salaries" },
  studio: { rent: "Studio rent", salaries: "Instructors & staff salaries" },
  library: { salaries: "Staff salaries" },
  food: { salaries: "Chefs & staff salaries" }
};

const COMMON_INCOME = [
  cat("other_income", "Other income", "#16a34a", "other"),
  cat("sponsorship", "Sponsorship", "#0d9488", "other"),
  cat("space_rental", "Space / equipment rental", "#2563eb", "other"),
  cat("refund_received", "Refunds & rebates", "#7c3aed", "other")
];
const EXTRA_INCOME = {
  gym: [cat("canteen", "Canteen / cafe sales", "#d97706", "other")],
  academy: [cat("canteen", "Canteen / cafe sales", "#d97706", "other")],
  library: [cat("canteen", "Canteen / cafe sales", "#d97706", "other")]
};

// kind: gym | academy | studio | library | food | retail | general
function defaultsFor(kind) {
  const k = EXTRA_EXPENSE[kind] ? kind : "general";
  const over = LABEL_OVERRIDES[k] || {};
  const expense = [
    ...COMMON_EXPENSE.map((c) => (over[c.slug] ? { ...c, label: over[c.slug] } : c)),
    ...EXTRA_EXPENSE[k],
    OTHER_EXPENSE
  ].map((c, i) => ({ ...c, sort_order: (i + 1) * 10 }));
  const income = [...COMMON_INCOME, ...(EXTRA_INCOME[k] || [])].map((c, i) => ({ ...c, sort_order: (i + 1) * 10 }));
  return { expense, income };
}

// Money that already lives in the app. Shown as "auto" and never entered twice.
const AUTO_INCOME = {
  membership_fees: "Membership fees",
  store_sales: "Store sales",
  student_fees: "Student fees",
  food_sales: "Food & drink sales",
  shop_sales: "Shop sales",
  booking_payments: "Booking payments"
};
const AUTO_EXPENSE = {
  staff_payroll: { label: "Staff payroll", cost_group: "people", color: "#0284c7" },
  aggregator_commission: { label: "Aggregator commission", cost_group: "operations", color: "#be123c" },
  stock_purchases: { label: "Stock purchases", cost_group: "cogs", color: "#7e22ce" }
};

// Guide thresholds, as % of income. Restaurant numbers follow published restaurant benchmarks
// (food cost 25-35%, labour 25-33%, rent 6-10%, prime cost 55-65%). The rest are STARTING GUIDELINES:
// tune them here as you learn from real vendor data.
const T = (id, label, max, match) => ({ id, label, max, ...match });
const GYMLIKE = [
  T("rent", "Rent", 25, { keys: ["rent"] }),
  T("people", "Staff & salaries", 45, { groups: ["people"] }),
  T("growth", "Marketing", 12, { groups: ["growth"] })
];
const THRESHOLDS = {
  gym: GYMLIKE,
  academy: GYMLIKE,
  studio: GYMLIKE,
  library: [
    T("rent", "Rent", 30, { keys: ["rent"] }),
    T("people", "Staff & salaries", 25, { groups: ["people"] }),
    T("power", "Electricity & water", 12, { keys: ["electricity"] })
  ],
  food: [
    T("food_cost", "Ingredients & packaging", 35, { groups: ["cogs"] }),
    T("labour", "Staff cost", 33, { groups: ["people"] }),
    T("rent", "Rent", 10, { keys: ["rent"] }),
    T("prime", "Prime cost (ingredients + staff)", 65, { groups: ["cogs", "people"] })
  ],
  retail: [
    T("cogs", "Stock & packaging cost", 75, { groups: ["cogs"] }),
    T("rent", "Rent", 10, { keys: ["rent"] }),
    T("people", "Staff & salaries", 15, { groups: ["people"] })
  ],
  general: [
    T("cogs", "Direct costs (vendors & materials)", 60, { groups: ["cogs"] }),
    T("people", "Staff & salaries", 30, { groups: ["people"] }),
    T("growth", "Marketing", 15, { groups: ["growth"] })
  ]
};
// Net margin (%) below which a profitable month is still flagged as thin. Restaurants run on 3-5%.
const MIN_MARGIN = { food: 5, default: 15 };

module.exports = {
  COST_GROUPS, PAYMENT_MODES, PALETTE, AUTO_INCOME, AUTO_EXPENSE, THRESHOLDS, MIN_MARGIN, defaultsFor
};