const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, BOOLEAN, DECIMAL, INTEGER, DATE, JSONB } = DataTypes;

// One row per pickup order. Prices are snapshots taken when the order is placed / edited.
const PickupOrder = sequelize.define("PickupOrder", {
  id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
  venue_id: { type: UUID, allowNull: false },
  order_no: { type: INTEGER, allowNull: false },
  // pending -> accepted -> ready -> completed   |   cancelled | no_show | fake
  status: { type: STRING(12), allowNull: false, defaultValue: "pending" },

  customer_name: { type: STRING(80), allowNull: false },
  customer_phone: { type: STRING(15), allowNull: false },
  customer_note: STRING(300),

  // [{ item_id, name, variant, qty, unit_price, line_total, unit, hsn_sac, tax_rate }]
  items: { type: JSONB, allowNull: false, defaultValue: [] },
  subtotal: { type: DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  total: { type: DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

  pickup_code: { type: STRING(8), allowNull: false },
  track_token: { type: STRING(48), allowNull: false },

  prep_minutes: INTEGER,
  promised_at: DATE,
  accepted_at: DATE,
  ready_at: DATE,
  completed_at: DATE,
  cancelled_at: DATE,
  cancel_reason: STRING(200),
  cancelled_by: STRING(10), // customer | vendor

  code_attempts: { type: INTEGER, allowNull: false, defaultValue: 0 },
  code_verified_at: DATE,
  code_override_reason: STRING(200),

  invoice_id: UUID,
  client_id: UUID,

  edit_log: { type: JSONB, allowNull: false, defaultValue: [] },
  edited_at: DATE,

  // false once the vendor clears a no-show / fake mark (unblocks the number)
  counts_against: { type: BOOLEAN, allowNull: false, defaultValue: true },
  placed_ip: STRING(45)
}, {
  tableName: "pickup_orders",
  indexes: [
    { fields: ["venue_id", "status"] },
    { unique: true, fields: ["venue_id", "order_no"] },
    { unique: true, fields: ["track_token"] },
    { fields: ["venue_id", "customer_phone"] }
  ]
});

const PickupOrderSettings = sequelize.define("PickupOrderSettings", {
  id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
  venue_id: { type: UUID, allowNull: false, unique: true },
  enabled: { type: BOOLEAN, allowNull: false, defaultValue: false },
  accepting: { type: BOOLEAN, allowNull: false, defaultValue: true },
  default_prep_minutes: { type: INTEGER, allowNull: false, defaultValue: 20 },
  min_order_amount: { type: DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  max_active_per_phone: { type: INTEGER, allowNull: false, defaultValue: 2 },
  block_after_no_shows: { type: INTEGER, allowNull: false, defaultValue: 2 },
  max_qty_per_item: { type: INTEGER, allowNull: false, defaultValue: 20 },
  instructions: { type: STRING(300), allowNull: false, defaultValue: "" }
}, { tableName: "pickup_order_settings" });

module.exports = { PickupOrder, PickupOrderSettings };