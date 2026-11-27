// Add-on tables. Standalone (like the gym, expense and academy modules) so no shared model changes.
// Created automatically at startup by addon.bootstrap.js (CREATE TABLE IF NOT EXISTS).
const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, DECIMAL, INTEGER, BOOLEAN, DATE } = DataTypes;

// One row per add-on: the price the Super Admin sets. Has the same price fields as a Plan, so the
// existing pricing + GST code (plans/planPricing.js) is reused without any change.
const AddonPrice = sequelize.define("AddonPrice", {
  addon_key: { type: STRING(40), primaryKey: true },
  monthly_price: { type: DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  yearly_price: { type: DECIMAL(10, 2), allowNull: true }, // NULL = monthly x 12
  discount_percent: { type: INTEGER, allowNull: false, defaultValue: 0 },
  offer_name: { type: STRING(80), allowNull: true },
  offer_ends_at: { type: DATE, allowNull: true },
  gst_inclusive: { type: BOOLEAN, allowNull: false, defaultValue: false },
  // true = vendors can buy it themselves. false = hidden from vendors (the Super Admin can still grant it).
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: false },
  updated_by: { type: UUID, allowNull: true }
}, { tableName: "addon_prices" });

// Who has which add-on, and until when. One row per vendor per add-on.
// Access is live while status = 'active' AND ends_at is in the future.
const VenueAddon = sequelize.define("VenueAddon", {
  id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
  venue_id: { type: UUID, allowNull: false },
  addon_key: { type: STRING(40), allowNull: false },
  status: { type: STRING(12), allowNull: false, defaultValue: "active" }, // active | cancelled
  source: { type: STRING(16), allowNull: false, defaultValue: "paid" }, // paid | manual | trial | complimentary
  billing_cycle: { type: STRING(10), allowNull: true }, // monthly | yearly | null (trial / complimentary)
  starts_at: { type: DATE, allowNull: false },
  ends_at: { type: DATE, allowNull: false },
  locked_price: { type: DECIMAL(10, 2), allowNull: true }, // last amount paid, WITHOUT GST
  last_payment_id: { type: UUID, allowNull: true },
  granted_by: { type: UUID, allowNull: true },
  note: { type: STRING(300), allowNull: true },
  cancelled_at: { type: DATE, allowNull: true }
}, {
  tableName: "venue_addons",
  indexes: [
    { unique: true, fields: ["venue_id", "addon_key"], name: "venue_addons_venue_key_uq" },
    { fields: ["addon_key", "status"] },
    { fields: ["ends_at"] }
  ]
});

module.exports = { AddonPrice, VenueAddon };