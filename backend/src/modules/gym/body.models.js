// Gym "Body Measurement" table. Standalone (like the academy, shift and attendance modules), so the
// shared gym models and every existing gym table stay untouched. Created automatically by
// ensureGymSchema() on startup. The name starts with "gym_" so the demo reset also clears it.
const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, DATEONLY, JSONB } = DataTypes;

// One row per member per day. "metrics" holds only the readings that were entered that day
// ({ weight: 72.4, chest: 98, ... } in kg / cm / seconds). Keys are validated against config/bodyMetrics.js.
const GymBodyRecord = sequelize.define("GymBodyRecord", {
  id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
  venue_id: { type: UUID, allowNull: false },
  member_id: { type: UUID, allowNull: false },
  recorded_on: { type: DATEONLY, allowNull: false },
  metrics: { type: JSONB, allowNull: false, defaultValue: {} },
  note: STRING(300),
  recorded_by: STRING(80)
}, {
  tableName: "gym_body_records",
  indexes: [
    { unique: true, fields: ["venue_id", "member_id", "recorded_on"], name: "gym_body_records_member_day_uq" },
    { fields: ["venue_id", "recorded_on"] }
  ]
});

async function ensure() {
  await GymBodyRecord.sync();
}

module.exports = { GymBodyRecord, ensure };