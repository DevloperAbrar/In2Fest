const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, TEXT, BOOLEAN, DECIMAL, DATEONLY, JSONB } = DataTypes;
const pk = () => ({ type: UUID, defaultValue: UUIDV4, primaryKey: true });

// Every change to a product's stock is one row here. stock_qty on the item is the running total.
const StockMovement = sequelize.define("StockMovement", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  item_id: { type: UUID, allowNull: false },
  variant: STRING(30),
  // opening | purchase | purchase_reversal | sale | sale_reversal | return | return_reversal | adjustment
  type: { type: STRING(20), allowNull: false },
  qty_change: { type: DECIMAL(12, 2), allowNull: false },
  balance_after: { type: DECIMAL(12, 2), allowNull: false }, // balance of that variant (or of the item if no variants)
  unit_cost: DECIMAL(10, 2),
  ref_type: STRING(20), // invoice | purchase
  ref_id: UUID,
  note: STRING(300),
  created_by: UUID
}, {
  tableName: "stock_movements",
  updatedAt: false,
  indexes: [{ fields: ["venue_id", "item_id"] }, { fields: ["venue_id"] }]
});

const Supplier = sequelize.define("InventorySupplier", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  name: { type: STRING(150), allowNull: false },
  phone: STRING(20),
  gstin: STRING(15),
  address: STRING(300),
  notes: STRING(300),
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: "inventory_suppliers", indexes: [{ fields: ["venue_id"] }] });

const Purchase = sequelize.define("InventoryPurchase", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  supplier_id: UUID,
  bill_number: STRING(50),
  bill_date: DATEONLY,
  items: { type: JSONB, allowNull: false, defaultValue: [] }, // [{ item_id, name, variant, quantity, unit_cost, amount }]
  total: { type: DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  amount_paid: { type: DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  status: { type: STRING(12), allowNull: false, defaultValue: "active" }, // active | cancelled
  notes: TEXT,
  created_by: UUID
}, { tableName: "inventory_purchases", indexes: [{ fields: ["venue_id"] }] });

module.exports = { StockMovement, Supplier, Purchase };