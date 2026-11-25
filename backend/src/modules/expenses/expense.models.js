const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, BOOLEAN, DECIMAL, DATEONLY, INTEGER } = DataTypes;
const pk = () => ({ type: UUID, defaultValue: UUIDV4, primaryKey: true });

// Per-vendor category list. System rows come from config/expenseCategories.js, custom rows (slug "c_...") from the vendor.
const ExpenseCategory = sequelize.define("ExpenseCategory", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  kind: { type: STRING(8), allowNull: false }, // expense | income
  slug: { type: STRING(40), allowNull: false },
  label: { type: STRING(60), allowNull: false },
  color: { type: STRING(9), allowNull: false, defaultValue: "#94a3b8" },
  cost_group: { type: STRING(12), allowNull: false, defaultValue: "operations" },
  monthly_budget: DECIMAL(12, 2),
  is_system: { type: BOOLEAN, allowNull: false, defaultValue: false },
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
  sort_order: { type: INTEGER, allowNull: false, defaultValue: 100 }
}, {
  tableName: "expense_categories",
  indexes: [{ unique: true, fields: ["venue_id", "kind", "slug"], name: "expense_categories_venue_kind_slug_uq" }]
});

// Manual money in / out. entry_date = the day it counts in the books (paid date, or the due date while status = due).
const ExpenseEntry = sequelize.define("ExpenseEntry", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  type: { type: STRING(8), allowNull: false }, // expense | income
  category_slug: { type: STRING(40), allowNull: false },
  amount: { type: DECIMAL(12, 2), allowNull: false },
  entry_date: { type: DATEONLY, allowNull: false },
  status: { type: STRING(6), allowNull: false, defaultValue: "paid" }, // paid | due (expenses only)
  mode: { type: STRING(20), allowNull: false, defaultValue: "cash" },
  vendor_name: STRING(100),
  reference: STRING(80),
  note: STRING(300),
  recurring_id: UUID,
  created_by: STRING(80)
}, {
  tableName: "expense_entries",
  indexes: [
    { fields: ["venue_id", "entry_date"] },
    { fields: ["venue_id", "type", "category_slug"] },
    { fields: ["venue_id", "status"] },
    // A recurring rule can post only one entry per day, even if two requests race.
    { unique: true, fields: ["recurring_id", "entry_date"], name: "expense_entries_recurring_day_uq" }
  ]
});

const ExpenseRecurring = sequelize.define("ExpenseRecurring", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  type: { type: STRING(8), allowNull: false },
  category_slug: { type: STRING(40), allowNull: false },
  amount: { type: DECIMAL(12, 2), allowNull: false },
  frequency: { type: STRING(8), allowNull: false }, // weekly | monthly | yearly
  day_of_month: { type: INTEGER, allowNull: false, defaultValue: 1 },
  start_date: { type: DATEONLY, allowNull: false },
  end_date: DATEONLY,
  next_run_on: { type: DATEONLY, allowNull: false },
  mode: { type: STRING(20), allowNull: false, defaultValue: "cash" },
  vendor_name: STRING(100),
  note: STRING(300),
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: "expense_recurring",
  indexes: [{ fields: ["venue_id"] }, { fields: ["is_active", "next_run_on"] }]
});

module.exports = { ExpenseCategory, ExpenseEntry, ExpenseRecurring };