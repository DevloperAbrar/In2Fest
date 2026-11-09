// Library tables. All standalone (prefix lib_), so no existing table is touched.
// Created by library.bootstrap.js (CREATE TABLE IF NOT EXISTS via sync).
const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, TEXT, INTEGER, BOOLEAN, DATE, DATEONLY, DECIMAL, JSONB } = DataTypes;
const pk = () => ({ type: UUID, defaultValue: UUIDV4, primaryKey: true });
const vid = () => ({ type: UUID, allowNull: false });
const money = () => ({ type: DECIMAL(12, 2), allowNull: false, defaultValue: 0 });

const LibSettings = sequelize.define("LibSettings", {
  venue_id: { type: UUID, primaryKey: true },
  qr_token: { type: STRING(40), allowNull: false },
  kiosk_token: { type: STRING(40), allowNull: false },
  qr_enabled: { type: BOOLEAN, allowNull: false, defaultValue: true },
  qr_mode: { type: STRING(10), allowNull: false, defaultValue: "static" }, // static | rotating
  require_phone: { type: BOOLEAN, allowNull: false, defaultValue: false },
  enforce_shift: { type: BOOLEAN, allowNull: false, defaultValue: false },
  grace_minutes: { type: INTEGER, allowNull: false, defaultValue: 30 },
  weekly_off: { type: JSONB, allowNull: false, defaultValue: [] },
  holidays: { type: JSONB, allowNull: false, defaultValue: [] },
  registration_fee: money(),
  receipt_prefix: { type: STRING(8), allowNull: false, defaultValue: "LR" },
  // used by the books module (next phase)
  loan_days: { type: INTEGER, allowNull: false, defaultValue: 14 },
  max_books: { type: INTEGER, allowNull: false, defaultValue: 2 },
  fine_per_day: money()
}, {
  tableName: "lib_settings",
  indexes: [
    { unique: true, fields: ["qr_token"], name: "lib_settings_qr_uq" },
    { unique: true, fields: ["kiosk_token"], name: "lib_settings_kiosk_uq" }
  ]
});

const LibHall = sequelize.define("LibHall", {
  id: pk(),
  venue_id: vid(),
  name: { type: STRING(60), allowNull: false },
  seat_start: { type: INTEGER, allowNull: false, defaultValue: 1 },
  seat_end: { type: INTEGER, allowNull: false },
  seats_per_row: { type: INTEGER, allowNull: false, defaultValue: 10 },
  blocked_seats: { type: JSONB, allowNull: false, defaultValue: [] },
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
  sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: "lib_halls", indexes: [{ fields: ["venue_id"] }] });

const LibShift = sequelize.define("LibShift", {
  id: pk(),
  venue_id: vid(),
  name: { type: STRING(60), allowNull: false },
  start_time: { type: STRING(5), allowNull: false },
  end_time: { type: STRING(5), allowNull: false },
  price: money(), // monthly fee
  is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
  sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: "lib_shifts", indexes: [{ fields: ["venue_id"] }] });

const LibStudent = sequelize.define("LibStudent", {
  id: pk(),
  venue_id: vid(),
  code_no: { type: INTEGER, allowNull: false },
  student_code: { type: STRING(12), allowNull: false },
  name: { type: STRING(100), allowNull: false },
  phone: { type: STRING(10), allowNull: false },
  photo_url: TEXT,
  father_name: STRING(100),
  joined_on: DATEONLY,
  dob: DATEONLY,
  gender: STRING(10),
  email: STRING(120),
  address: TEXT,
  exam_preparing: STRING(100),
  emergency_phone: STRING(10),
  aadhaar_last4: STRING(4),
  aadhaar_enc: TEXT, // AES-GCM encrypted full number, owner-only reveal
  notes: TEXT,
  status: { type: STRING(10), allowNull: false, defaultValue: "active" }, // active | frozen | left
  frozen_on: DATEONLY,
  is_archived: { type: BOOLEAN, allowNull: false, defaultValue: false },
  portal_token: STRING(40),
  // denormalised money / dates, kept in sync by core.recompute()
  end_date: DATEONLY,
  balance_due: money(),
  total_paid: money()
}, {
  tableName: "lib_students",
  indexes: [
    { unique: true, fields: ["venue_id", "code_no"], name: "lib_students_code_uq" },
    { fields: ["venue_id", "status"] },
    { fields: ["venue_id", "end_date"] }
  ]
});

// A seat in a hall for a shift. Only one ACTIVE row per student (see partial indexes in ensure()).
const LibAllocation = sequelize.define("LibAllocation", {
  id: pk(),
  venue_id: vid(),
  student_id: { type: UUID, allowNull: false },
  hall_id: { type: UUID, allowNull: false },
  seat_no: { type: INTEGER, allowNull: false },
  shift_id: { type: UUID, allowNull: false },
  status: { type: STRING(10), allowNull: false, defaultValue: "active" }, // active | released
  released_at: DATE
}, {
  tableName: "lib_allocations",
  indexes: [{ fields: ["venue_id", "hall_id"] }, { fields: ["shift_id"] }, { fields: ["student_id"] }]
});

const LibMembership = sequelize.define("LibMembership", {
  id: pk(),
  venue_id: vid(),
  student_id: { type: UUID, allowNull: false },
  shift_id: UUID,
  shift_name: STRING(60),
  hall_name: STRING(60),
  seat_no: INTEGER,
  kind: { type: STRING(10), allowNull: false, defaultValue: "new" }, // new | renewal
  duration_unit: { type: STRING(10), allowNull: false, defaultValue: "months" },
  duration_value: { type: INTEGER, allowNull: false, defaultValue: 1 },
  start_date: { type: DATEONLY, allowNull: false },
  end_date: { type: DATEONLY, allowNull: false },
  base_price: money(),
  discount_amount: money(),
  registration_fee: money(),
  total_amount: money(),
  amount_paid: money(),
  status: { type: STRING(10), allowNull: false, defaultValue: "active" },
  notes: STRING(300)
}, {
  tableName: "lib_memberships",
  indexes: [{ fields: ["venue_id", "student_id"] }, { fields: ["venue_id", "end_date"] }]
});

const LibPayment = sequelize.define("LibPayment", {
  id: pk(),
  venue_id: vid(),
  student_id: { type: UUID, allowNull: false },
  membership_id: UUID,
  kind: { type: STRING(10), allowNull: false, defaultValue: "fee" }, // fee | fine | other
  amount: { type: DECIMAL(12, 2), allowNull: false },
  mode: { type: STRING(20), allowNull: false, defaultValue: "cash" },
  paid_on: { type: DATEONLY, allowNull: false },
  receipt_seq: { type: INTEGER, allowNull: false },
  receipt_no: { type: STRING(20), allowNull: false },
  reference: STRING(80),
  note: STRING(200),
  collected_by: STRING(80),
  status: { type: STRING(10), allowNull: false, defaultValue: "paid" }, // paid | void
  voided_at: DATE,
  void_reason: STRING(200)
}, {
  tableName: "lib_payments",
  indexes: [{ fields: ["venue_id", "paid_on"] }, { fields: ["student_id"] }, { fields: ["membership_id"] }]
});

const LibAttendance = sequelize.define("LibAttendance", {
  id: pk(),
  venue_id: vid(),
  student_id: { type: UUID, allowNull: false },
  att_date: { type: DATEONLY, allowNull: false },
  status: { type: STRING(10), allowNull: false, defaultValue: "present" }, // present | absent
  check_in_at: DATE,
  check_out_at: DATE,
  source: { type: STRING(10), allowNull: false, defaultValue: "manual" }, // qr | manual
  marked_by: STRING(80),
  note: STRING(200)
}, {
  tableName: "lib_attendance",
  indexes: [
    { unique: true, fields: ["venue_id", "student_id", "att_date"], name: "lib_attendance_student_day_uq" },
    { fields: ["venue_id", "att_date"] }
  ]
});

const LibBook = sequelize.define("LibBook", {
    id: pk(),
    venue_id: vid(),
    title: { type: STRING(200), allowNull: false },
    author: STRING(150),
    isbn: STRING(20),
    subject: STRING(80),
    publisher: STRING(120),
    edition: STRING(40),
    language: STRING(30),
    rack: STRING(40), // shelf / rack location, no photos on purpose
    total_copies: { type: INTEGER, allowNull: false, defaultValue: 1 },
    price: money(), // replacement cost, charged if the book is lost
    is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    notes: STRING(300)
  }, { tableName: "lib_books", indexes: [{ fields: ["venue_id"] }, { fields: ["venue_id", "subject"] }] });
  
  const LibBookLoan = sequelize.define("LibBookLoan", {
    id: pk(),
    venue_id: vid(),
    book_id: { type: UUID, allowNull: false },
    student_id: { type: UUID, allowNull: false },
    issued_on: { type: DATEONLY, allowNull: false },
    due_on: { type: DATEONLY, allowNull: false },
    returned_on: DATEONLY,
    status: { type: STRING(10), allowNull: false, defaultValue: "issued" }, // issued | returned | lost
    renewals: { type: INTEGER, allowNull: false, defaultValue: 0 },
    fine_amount: money(),
    fine_paid: money(),
    fine_waived: money(),
    issued_by: STRING(80),
    returned_by: STRING(80),
    note: STRING(200)
  }, {
    tableName: "lib_book_loans",
    indexes: [{ fields: ["venue_id", "status"] }, { fields: ["book_id"] }, { fields: ["student_id"] }, { fields: ["venue_id", "due_on"] }]
  });
  
  // Which WhatsApp reminder was already sent to a student (so the same one is not shown again every day).
  const LibReminder = sequelize.define("LibReminder", {
    id: pk(),
    venue_id: vid(),
    student_id: { type: UUID, allowNull: false },
    kind: { type: STRING(12), allowNull: false },
    sent_on: { type: DATEONLY, allowNull: false },
    sent_by: STRING(80)
  }, { tableName: "lib_reminders", indexes: [{ fields: ["venue_id", "student_id", "sent_on"] }] });

const SYNC_ORDER = [LibSettings, LibHall, LibShift, LibStudent, LibAllocation, LibMembership, LibPayment, LibAttendance, LibBook, LibBookLoan, LibReminder];

// Database-level guards. These are the final protection against double booking, even if two
// staff members click at the same moment.
const RAW_STATEMENTS = [
  `CREATE UNIQUE INDEX IF NOT EXISTS lib_alloc_seat_uq ON lib_allocations (hall_id, seat_no, shift_id) WHERE status = 'active'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS lib_alloc_student_uq ON lib_allocations (student_id) WHERE status = 'active'`,
  `DROP INDEX IF EXISTS lib_students_phone_uq`,
  `CREATE UNIQUE INDEX IF NOT EXISTS lib_pay_receipt_uq ON lib_payments (venue_id, receipt_seq)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS lib_loan_open_uq ON lib_book_loans (book_id, student_id) WHERE status = 'issued'`,
  `CREATE TABLE IF NOT EXISTS lib_migrations (key VARCHAR(60) PRIMARY KEY, ran_at TIMESTAMPTZ NOT NULL DEFAULT now())`
];

async function ensure() {
  for (const model of SYNC_ORDER) await model.sync();
  for (const sql of RAW_STATEMENTS) await sequelize.query(sql);
}

module.exports = {
    sequelize, LibSettings, LibHall, LibShift, LibStudent, LibAllocation, LibMembership, LibPayment, LibAttendance,
    LibBook, LibBookLoan, LibReminder, ensure
  };