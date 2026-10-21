// Supplement store for gyms: categories, products with variants (size / flavour), stock ledger
// and counter sales (bills). Standalone, like the inventory module, so the shared
// models/index.js is not touched. Tables are created by ensure() at server start.
const { DataTypes, Op } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, TEXT, INTEGER, BOOLEAN, DECIMAL, DATEONLY, DATE, JSONB } = DataTypes;
// pk() / money() are functions on purpose: a shared object would make every attribute point to one column.
const pk = () => ({ type: UUID, defaultValue: UUIDV4, primaryKey: true });
const money = () => ({ type: DECIMAL(10, 2), allowNull: false, defaultValue: 0 });

const GymStoreSettings = sequelize.define("GymStoreSettings", {
  venue_id: { type: UUID, primaryKey: true },
  show_on_website: { type: BOOLEAN, allowNull: false, defaultValue: true },
  show_out_of_stock: { type: BOOLEAN, allowNull: false, defaultValue: true },
  tagline: STRING(160),
  invoice_prefix: { type: STRING(8), allowNull: false, defaultValue: "SUP" },
  invoice_terms: TEXT,
  low_stock_default: { type: INTEGER, allowNull: false, defaultValue: 3 },
  categories_seeded: { type: BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: "gym_store_settings" });

const GymStoreCategory = sequelize.define("GymStoreCategory", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  name: { type: STRING(60), allowNull: false },
  sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: "gym_store_categories", indexes: [{ fields: ["venue_id"] }] });

const GymProduct = sequelize.define("GymProduct", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  category_id: UUID,
  name: { type: STRING(150), allowNull: false },
  brand: STRING(80),
  description: TEXT,
  highlights: { type: JSONB, allowNull: false, defaultValue: [] },
  image_url: TEXT,
  gallery: { type: JSONB, allowNull: false, defaultValue: [] },
  offer_label: STRING(40),
  offer_ends_on: DATEONLY,
  is_featured: { type: BOOLEAN, allowNull: false, defaultValue: false },
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
  show_on_website: { type: BOOLEAN, allowNull: false, defaultValue: true },
  is_archived: { type: BOOLEAN, allowNull: false, defaultValue: false },
  tax_rate: { type: DECIMAL(5, 2), allowNull: false, defaultValue: 18 }, // prices are GST inclusive
  hsn: STRING(12),
  sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: "gym_products", indexes: [{ fields: ["venue_id", "is_archived"] }, { fields: ["category_id"] }] });

// One sellable unit: "1 kg Chocolate", "2 kg Vanilla", "Free size". Stock lives here.
const GymProductVariant = sequelize.define("GymProductVariant", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  product_id: { type: UUID, allowNull: false },
  label: { type: STRING(80), allowNull: false },
  sku: STRING(40),
  barcode: STRING(40),
  mrp: { type: DECIMAL(10, 2) },
  price: money(),
  cost_price: money(),
  stock_qty: { type: INTEGER, allowNull: false, defaultValue: 0 },
  low_stock_threshold: INTEGER,
  expiry_date: DATEONLY,
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
  sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: "gym_product_variants",
  indexes: [
    { fields: ["venue_id"] },
    { fields: ["product_id"] },
    { unique: true, fields: ["venue_id", "sku"], where: { sku: { [Op.ne]: null } }, name: "gym_variants_venue_sku_uq" }
  ]
});

// Every change of stock is one row here. stock_qty on the variant is the running total.
const GymStockMovement = sequelize.define("GymStockMovement", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  product_id: { type: UUID, allowNull: false },
  variant_id: { type: UUID, allowNull: false },
  type: { type: STRING(20), allowNull: false }, // opening | purchase | sale | sale_reversal | return | adjustment
  qty_change: { type: INTEGER, allowNull: false },
  balance_after: { type: INTEGER, allowNull: false },
  unit_cost: { type: DECIMAL(10, 2) },
  ref_id: UUID,
  note: STRING(300),
  created_by_name: STRING(80)
}, { tableName: "gym_stock_movements", updatedAt: false, indexes: [{ fields: ["venue_id"] }, { fields: ["variant_id"] }] });

// A counter bill. Lines are a snapshot, so later price or name changes never alter old bills.
const GymSale = sequelize.define("GymSale", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  seq: { type: INTEGER, allowNull: false },
  invoice_no: { type: STRING(30), allowNull: false },
  member_id: UUID,
  customer_name: { type: STRING(100), allowNull: false, defaultValue: "Walk-in customer" },
  customer_phone: STRING(10),
  items: { type: JSONB, allowNull: false, defaultValue: [] },
  subtotal: money(),
  line_discount: money(),
  discount: money(),
  total: money(),
  tax_amount: money(),
  cost_total: money(),
  amount_paid: money(),
  status: { type: STRING(12), allowNull: false, defaultValue: "paid" }, // paid | partial | due | cancelled
  payments: { type: JSONB, allowNull: false, defaultValue: [] },
  sold_on: { type: DATEONLY, allowNull: false },
  notes: TEXT,
  share_token: STRING(40),
  cancelled_at: DATE,
  cancel_reason: STRING(200),
  created_by_name: STRING(80)
}, {
  tableName: "gym_sales",
  indexes: [
    { fields: ["venue_id", "sold_on"] },
    { fields: ["member_id"] },
    { unique: true, fields: ["venue_id", "seq"], name: "gym_sales_venue_seq_uq" },
    { unique: true, fields: ["share_token"], name: "gym_sales_share_token_uq" }
  ]
});

async function ensure() {
  for (const model of [GymStoreSettings, GymStoreCategory, GymProduct, GymProductVariant, GymStockMovement, GymSale]) await model.sync();
}

module.exports = {
  sequelize, GymStoreSettings, GymStoreCategory, GymProduct, GymProductVariant, GymStockMovement, GymSale, ensure
};