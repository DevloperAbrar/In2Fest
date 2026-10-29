const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, TEXT, INTEGER, BOOLEAN, DECIMAL, DATEONLY, DATE, JSONB } = DataTypes;
const pk = () => ({ type: UUID, defaultValue: UUIDV4, primaryKey: true });
const money = () => ({ type: DECIMAL(10, 2), allowNull: false, defaultValue: 0 });

const GymStaff = sequelize.define("GymStaff", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  seq: { type: INTEGER, allowNull: false },
  staff_code: { type: STRING(12), allowNull: false },
  name: { type: STRING(100), allowNull: false },
  phone: { type: STRING(10), allowNull: false },
  email: STRING(120),
  designation: STRING(60),
  joining_date: { type: DATEONLY, allowNull: false },
  left_date: DATEONLY,
  monthly_salary: money(),
  deduction_per_day: money(),
  free_leave_days: { type: DECIMAL(4, 1), allowNull: false, defaultValue: 0 },
  weekly_off_days: { type: JSONB, allowNull: false, defaultValue: [] },
  shift_timing: STRING(40),
  address: TEXT,
  emergency_contact: STRING(60),
  upi_id: STRING(80),
  notes: TEXT,
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: "gym_staff",
  indexes: [
    { fields: ["venue_id", "is_active"] },
    { unique: true, fields: ["venue_id", "seq"], name: "gym_staff_venue_seq_uq" }
  ]
});

const GymStaffAttendance = sequelize.define("GymStaffAttendance", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  staff_id: { type: UUID, allowNull: false },
  date: { type: DATEONLY, allowNull: false },
  status: { type: STRING(12), allowNull: false },
  note: STRING(120),
  marked_by: STRING(80)
}, {
  tableName: "gym_staff_attendance",
  indexes: [
    { unique: true, fields: ["staff_id", "date"], name: "gym_staff_att_uq" },
    { fields: ["venue_id", "date"] }
  ]
});

const GymStaffPayroll = sequelize.define("GymStaffPayroll", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  staff_id: { type: UUID, allowNull: false },
  month: { type: STRING(7), allowNull: false },
  bonus: money(),
  other_deduction: money(),
  note: STRING(200)
}, {
  tableName: "gym_staff_payroll",
  indexes: [{ unique: true, fields: ["staff_id", "month"], name: "gym_staff_payroll_uq" }, { fields: ["venue_id", "month"] }]
});

const GymStaffPayment = sequelize.define("GymStaffPayment", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  staff_id: { type: UUID, allowNull: false },
  month: { type: STRING(7), allowNull: false },
  amount: { type: DECIMAL(10, 2), allowNull: false },
  mode: { type: STRING(20), allowNull: false, defaultValue: "cash" },
  status: { type: STRING(10), allowNull: false, defaultValue: "paid" },
  paid_on: DATEONLY,
  reference: STRING(80),
  notes: STRING(300),
  receipt_seq: INTEGER,
  receipt_no: STRING(30),
  paid_by: STRING(80),
  snapshot: { type: JSONB, allowNull: false, defaultValue: {} },
  cancelled_at: DATE,
  cancel_reason: STRING(200)
}, {
  tableName: "gym_staff_payments",
  indexes: [
    { fields: ["venue_id", "month"] },
    { fields: ["staff_id", "month"] },
    { unique: true, fields: ["venue_id", "receipt_seq"], name: "gym_staff_pay_receipt_uq" }
  ]
});

async function ensure() {
  await GymStaff.sync();
  await GymStaffAttendance.sync();
  await GymStaffPayroll.sync();
  await GymStaffPayment.sync();
}

module.exports = { GymStaff, GymStaffAttendance, GymStaffPayroll, GymStaffPayment, ensure };