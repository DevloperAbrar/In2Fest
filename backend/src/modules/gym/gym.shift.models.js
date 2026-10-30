// Optional gym shifts (time slots such as "Morning 7-8 AM") and the member -> shift link.
// Standalone tables (like the message and card modules), so the shared models and the
// existing gym_members table are NOT touched. Created automatically by ensureGymSchema().
const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, INTEGER, BOOLEAN } = DataTypes;

const GymShift = sequelize.define("GymShift", {
  id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
  venue_id: { type: UUID, allowNull: false },
  name: { type: STRING(60), allowNull: false },
  start_time: { type: STRING(5), allowNull: false }, // "HH:MM" 24h
  end_time: { type: STRING(5), allowNull: false },
  capacity: { type: INTEGER, allowNull: true }, // optional, informational
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
  sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: "gym_shifts", indexes: [{ fields: ["venue_id"] }] });

// One row per member: a member has at most one shift. No row = no shift.
const GymMemberShift = sequelize.define("GymMemberShift", {
  member_id: { type: UUID, primaryKey: true },
  venue_id: { type: UUID, allowNull: false },
  shift_id: { type: UUID, allowNull: false }
}, { tableName: "gym_member_shifts", indexes: [{ fields: ["venue_id"] }, { fields: ["shift_id"] }] });

async function ensure() {
  await GymShift.sync();
  await GymMemberShift.sync();
}

module.exports = { GymShift, GymMemberShift, ensure };