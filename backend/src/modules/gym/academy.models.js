// Sports Academy / Studio tables. Standalone (like the shift and attendance modules), so the
// shared gym models and every existing gym table stay untouched. Created automatically by
// ensureGymSchema() on startup. Names start with "gym_" so the demo reset also clears them.
const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, TEXT, INTEGER, BOOLEAN, DATEONLY, DECIMAL, JSONB } = DataTypes;
const pk = () => ({ type: UUID, defaultValue: UUIDV4, primaryKey: true });

// One row per student: sport/class details that the shared member table does not have.
const GymMemberProfile = sequelize.define("GymMemberProfile", {
  member_id: { type: UUID, primaryKey: true },
  venue_id: { type: UUID, allowNull: false },
  disciplines: { type: JSONB, allowNull: false, defaultValue: [] },
  fields: { type: JSONB, allowNull: false, defaultValue: {} },
  levels: { type: JSONB, allowNull: false, defaultValue: {} },
  school: STRING(120),
  blood_group: STRING(5),
  kit_size: STRING(10),
  parent_phone: STRING(15),
  medical_notes: TEXT
}, { tableName: "gym_member_profiles", indexes: [{ fields: ["venue_id"] }] });

const GymBatch = sequelize.define("GymBatch", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  name: { type: STRING(60), allowNull: false },
  discipline: STRING(30),
  days: { type: JSONB, allowNull: false, defaultValue: [] },
  start_time: { type: STRING(5), allowNull: false },
  end_time: { type: STRING(5), allowNull: false },
  coach_name: STRING(80),
  location: STRING(100),
  age_min: INTEGER,
  age_max: INTEGER,
  level: STRING(30),
  capacity: INTEGER,
  notes: STRING(300),
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
  sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: "gym_batches", indexes: [{ fields: ["venue_id"] }] });

const GymBatchMember = sequelize.define("GymBatchMember", {
  batch_id: { type: UUID, primaryKey: true },
  member_id: { type: UUID, primaryKey: true },
  venue_id: { type: UUID, allowNull: false },
  joined_on: DATEONLY
}, { tableName: "gym_batch_members", indexes: [{ fields: ["venue_id"] }, { fields: ["member_id"] }] });

const GymTestTemplate = sequelize.define("GymTestTemplate", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  key: { type: STRING(40), allowNull: false },
  discipline: STRING(30),
  name: { type: STRING(80), allowNull: false },
  unit: { type: STRING(15), allowNull: false, defaultValue: "" },
  better: { type: STRING(6), allowNull: false, defaultValue: "higher" },
  kind: { type: STRING(10), allowNull: false, defaultValue: "measure" },
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: "gym_test_templates",
  indexes: [{ unique: true, fields: ["venue_id", "key"], name: "gym_test_templates_venue_key_uq" }]
});

const GymAssessment = sequelize.define("GymAssessment", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  member_id: { type: UUID, allowNull: false },
  test_key: { type: STRING(80), allowNull: false },
  value: { type: DECIMAL(12, 2), allowNull: false },
  recorded_on: { type: DATEONLY, allowNull: false },
  note: STRING(200),
  recorded_by: STRING(80)
}, {
  tableName: "gym_assessments",
  indexes: [
    { fields: ["venue_id", "member_id", "test_key"] },
    { fields: ["venue_id", "recorded_on"] }
  ]
});

// Vendor's own practice drills (built-in drills live in config/academyDrills.js).
const GymDrill = sequelize.define("GymDrill", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  discipline: STRING(30),
  title: { type: STRING(100), allowNull: false },
  category: STRING(40),
  minutes: INTEGER,
  equipment: STRING(120),
  instructions: TEXT
}, { tableName: "gym_drills", indexes: [{ fields: ["venue_id"] }] });

// Tournaments, matches, camps, trials, grading exams, recitals.
const GymEvent = sequelize.define("GymEvent", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  title: { type: STRING(120), allowNull: false },
  type: { type: STRING(20), allowNull: false, defaultValue: "other" },
  discipline: STRING(30),
  event_date: { type: DATEONLY, allowNull: false },
  location: STRING(120),
  fee: { type: DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  description: TEXT,
  status: { type: STRING(12), allowNull: false, defaultValue: "scheduled" } // scheduled | completed | cancelled
}, { tableName: "gym_events", indexes: [{ fields: ["venue_id", "event_date"] }] });

const GymEventParticipant = sequelize.define("GymEventParticipant", {
  event_id: { type: UUID, primaryKey: true },
  member_id: { type: UUID, primaryKey: true },
  venue_id: { type: UUID, allowNull: false },
  result: STRING(60),
  notes: STRING(200),
  fee_paid: { type: BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: "gym_event_participants", indexes: [{ fields: ["venue_id"] }, { fields: ["member_id"] }] });

async function ensure() {
  await GymMemberProfile.sync();
  await GymBatch.sync();
  await GymBatchMember.sync();
  await GymTestTemplate.sync();
  await GymAssessment.sync();
  await GymDrill.sync();
  await GymEvent.sync();
  await GymEventParticipant.sync();
}

module.exports = {
  GymMemberProfile, GymBatch, GymBatchMember, GymTestTemplate, GymAssessment,
  GymDrill, GymEvent, GymEventParticipant, ensure
};