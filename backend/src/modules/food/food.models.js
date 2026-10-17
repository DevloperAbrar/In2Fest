// All food tables live here. Orders keep a full snapshot of their lines, so menu edits never
// change an old bill. Tables are created by food.bootstrap.js at server start.
const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, TEXT, INTEGER, BOOLEAN, DECIMAL, DATEONLY, DATE, JSONB } = DataTypes;
// Functions on purpose: one shared object reused for several attributes makes them share a column.
const pk = () => ({ type: UUID, defaultValue: UUIDV4, primaryKey: true });
const amt = () => ({ type: DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
const pct = (d = 0) => ({ type: DECIMAL(5, 2), allowNull: false, defaultValue: d });
const qty = () => ({ type: DECIMAL(12, 3), allowNull: false, defaultValue: 0 });
const bool = (d) => ({ type: BOOLEAN, allowNull: false, defaultValue: d });

const FoodSettings = sequelize.define("FoodSettings", {
  venue_id: { type: UUID, primaryKey: true },
  accepting_orders: bool(true),
  allow_delivery: bool(true),
  allow_pickup: bool(true),
  allow_dine_in: bool(true),
  min_order: amt(),
  delivery_fee: amt(),
  free_delivery_above: amt(),
  packing_fee: amt(),
  prep_time_min: { type: INTEGER, allowNull: false, defaultValue: 25 },
  service_charge_percent: pct(0),
  default_tax_rate: pct(5),
  aggregator_commission: pct(25),
  gst_scheme: { type: STRING(12), allowNull: false, defaultValue: "regular" }, // regular | composition
  prices_include_tax: bool(false),
  fssai_no: STRING(20),
  bill_footer: STRING(200),
  delivery_note: STRING(200),
  message_templates: { type: JSONB, allowNull: false, defaultValue: {} }
}, { tableName: "food_settings" });

const FoodCategory = sequelize.define("FoodCategory", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  name: { type: STRING(80), allowNull: false },
  sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
  is_active: bool(true)
}, { tableName: "food_categories", indexes: [{ fields: ["venue_id"] }] });

// A food-court stall or a franchise outlet.
const FoodUnit = sequelize.define("FoodUnit", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  name: { type: STRING(100), allowNull: false },
  kind: { type: STRING(10), allowNull: false, defaultValue: "stall" },
  contact_name: STRING(100),
  phone: STRING(15),
  share_percent: pct(0),
  is_active: bool(true)
}, { tableName: "food_units", indexes: [{ fields: ["venue_id"] }] });

const FoodItem = sequelize.define("FoodItem", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  category_id: UUID,
  unit_id: UUID,
  name: { type: STRING(120), allowNull: false },
  description: STRING(300),
  image_url: TEXT,
  price: amt(), // lowest price when the item has sizes
  variants: { type: JSONB, allowNull: false, defaultValue: [] }, // [{ name: "Half", price: 120 }]
  food_type: { type: STRING(8), allowNull: false, defaultValue: "veg" }, // veg | nonveg | egg
  spice_level: { type: INTEGER, allowNull: false, defaultValue: 0 },
  tax_rate: { type: DECIMAL(5, 2) }, // null = restaurant default
  hsn_sac: STRING(10),
  is_available: bool(true), // the "sold out" switch
  is_active: bool(true), // false = deleted
  show_on_website: bool(true),
  is_bestseller: bool(false),
  prep_time_min: INTEGER,
  recipe: { type: JSONB, allowNull: false, defaultValue: [] }, // [{ ingredient_id, qty }] per 1 portion
  sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: "food_items", indexes: [{ fields: ["venue_id"] }, { fields: ["venue_id", "category_id"] }] });

const FoodTable = sequelize.define("FoodTable", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  name: { type: STRING(30), allowNull: false },
  section: STRING(40),
  seats: { type: INTEGER, allowNull: false, defaultValue: 4 }
}, { tableName: "food_tables", indexes: [{ unique: true, fields: ["venue_id", "name"], name: "food_tables_venue_name_uq" }] });

const FoodOrder = sequelize.define("FoodOrder", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  seq: { type: INTEGER, allowNull: false },
  order_no: { type: STRING(12), allowNull: false },
  token_no: { type: INTEGER, allowNull: false },
  order_date: { type: DATEONLY, allowNull: false }, // IST date
  order_hour: { type: INTEGER, allowNull: false, defaultValue: 0 }, // IST hour
  order_type: { type: STRING(10), allowNull: false },
  source: { type: STRING(12), allowNull: false, defaultValue: "pos" }, // pos | website | qr | zomato | swiggy | other_app
  table_name: STRING(30),
  room_no: STRING(20),
  unit_id: UUID,
  customer_name: STRING(100),
  customer_phone: STRING(15),
  address: TEXT,
  notes: TEXT,
  items: { type: JSONB, allowNull: false, defaultValue: [] }, // item lines + charge lines (kind: "charge")
  subtotal: amt(),
  discount_amount: amt(),
  taxable_amount: amt(),
  cgst: amt(),
  sgst: amt(),
  tax_breakup: { type: JSONB, allowNull: false, defaultValue: [] },
  round_off: { type: DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
  total: amt(),
  status: { type: STRING(12), allowNull: false, defaultValue: "new" }, // new | preparing | ready | completed | cancelled
  payment_status: { type: STRING(10), allowNull: false, defaultValue: "unpaid" }, // unpaid | paid | refunded
  payment_mode: STRING(10),
  amount_paid: amt(),
  paid_at: DATE,
  commission_percent: pct(0),
  commission_amount: amt(),
  tracking_token: { type: STRING(40), allowNull: false },
  stock_deducted: bool(false),
  cancel_reason: STRING(200),
  completed_at: DATE,
  meta: { type: JSONB, allowNull: false, defaultValue: {} }
}, {
  tableName: "food_orders",
  indexes: [
    { fields: ["venue_id", "order_date"] },
    { fields: ["venue_id", "status"] },
    { unique: true, fields: ["venue_id", "seq"], name: "food_orders_venue_seq_uq" },
    { unique: true, fields: ["tracking_token"], name: "food_orders_token_uq" }
  ]
});

const FoodCustomer = sequelize.define("FoodCustomer", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  phone: { type: STRING(10), allowNull: false },
  name: { type: STRING(100), allowNull: false, defaultValue: "Guest" },
  orders_count: { type: INTEGER, allowNull: false, defaultValue: 0 },
  total_spent: amt(),
  first_order_at: DATE,
  last_order_at: DATE
}, { tableName: "food_customers", indexes: [{ unique: true, fields: ["venue_id", "phone"], name: "food_customers_venue_phone_uq" }] });

const FoodIngredient = sequelize.define("FoodIngredient", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  name: { type: STRING(100), allowNull: false },
  unit: { type: STRING(8), allowNull: false, defaultValue: "kg" },
  stock_qty: qty(),
  reorder_level: qty(),
  cost_per_unit: amt(),
  is_active: bool(true)
}, { tableName: "food_ingredients", indexes: [{ fields: ["venue_id"] }] });

const FoodStockLog = sequelize.define("FoodStockLog", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  ingredient_id: { type: UUID, allowNull: false },
  type: { type: STRING(10), allowNull: false }, // purchase | wastage | adjust | sale
  qty_change: { type: DECIMAL(12, 3), allowNull: false },
  balance_after: { type: DECIMAL(12, 3), allowNull: false },
  note: STRING(200),
  order_id: UUID
}, { tableName: "food_stock_log", updatedAt: false, indexes: [{ fields: ["venue_id", "ingredient_id"] }] });

module.exports = {
  FoodSettings, FoodCategory, FoodUnit, FoodItem, FoodTable, FoodOrder, FoodCustomer, FoodIngredient, FoodStockLog
};