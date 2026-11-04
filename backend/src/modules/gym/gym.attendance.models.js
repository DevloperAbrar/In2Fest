// Member attendance + attendance settings. Standalone tables (like the shift module), so the shared
// models and every existing gym table stay untouched. Created automatically by ensureGymSchema().
const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, BOOLEAN, DATE, DATEONLY, JSONB } = DataTypes;

// One row per member per day. present | absent. No row = "not marked" (counted as absent in reports).
const GymAttendance = sequelize.define("GymAttendance", {
  id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
  venue_id: { type: UUID, allowNull: false },
  member_id: { type: UUID, allowNull: false },
  att_date: { type: DATEONLY, allowNull: false }, // IST calendar day
  status: { type: STRING(10), allowNull: false, defaultValue: "present" },
  check_in_at: { type: DATE }, // exact time (QR scan or marked today by staff)
  source: { type: STRING(10), allowNull: false, defaultValue: "manual" }, // qr | manual
  marked_by: STRING(80),
  note: STRING(200)
}, {
  tableName: "gym_attendance",
  indexes: [
    { unique: true, fields: ["venue_id", "member_id", "att_date"], name: "gym_attendance_member_day_uq" },
    { fields: ["venue_id", "att_date"] },
    { fields: ["member_id"] }
  ]
});

const GymAttendanceSettings = sequelize.define("GymAttendanceSettings", {
  venue_id: { type: UUID, primaryKey: true },
  weekly_off: { type: JSONB, allowNull: false, defaultValue: [] }, // [0..6], Sunday = 0
  holidays: { type: JSONB, allowNull: false, defaultValue: [] }, // [{ date: "YYYY-MM-DD", name }]
  qr_enabled: { type: BOOLEAN, allowNull: false, defaultValue: true },
  require_phone: { type: BOOLEAN, allowNull: false, defaultValue: false }, // ask last 4 digits of mobile
  qr_token: { type: STRING(40), allowNull: false }
}, {
  tableName: "gym_attendance_settings",
  indexes: [{ unique: true, fields: ["qr_token"], name: "gym_att_settings_token_uq" }]
});

async function ensure() {
  await GymAttendance.sync();
  await GymAttendanceSettings.sync();
}

module.exports = { GymAttendance, GymAttendanceSettings, ensure };