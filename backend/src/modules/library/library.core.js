// Shared rules for the library module: seat conflicts, pricing, money totals, status.
const { sequelize } = require("../../config/database");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const C = require("./library.constants");
const M = require("./library.models");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => UUID_RE.test(String(v));
const blank = (v) => v === undefined || v === null || String(v).trim() === "";
const clean = (v, max) => (blank(v) ? null : String(v).trim().slice(0, max));
const lock = (tx, key) => sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:k))", { replacements: { k: key }, transaction: tx });

// Sequential per-venue numbers (student code, receipt number) without gaps or races.
async function nextSeq(tx, venueId, table, col) {
  await lock(tx, `${table}:${venueId}`);
  const [[row]] = await sequelize.query(`SELECT COALESCE(MAX(${col}), 0) + 1 AS n FROM ${table} WHERE venue_id = :v`, {
    replacements: { v: venueId }, transaction: tx
  });
  return Number(row.n);
}

/* ---------------- time / shifts ---------------- */
const toMin = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
const fmt12 = (t) => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(t || ""));
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
};
// A shift that ends before it starts (22:00 - 06:00) crosses midnight.
const segments = (s) => { const a = toMin(s.start_time); const b = toMin(s.end_time); return a < b ? [[a, b]] : [[a, 1440], [0, b]]; };
const shiftsOverlap = (x, y) => segments(x).some(([a, b]) => segments(y).some(([c, d]) => a < d && c < b));
const nowMinIST = () => { const d = new Date(Date.now() + 330 * 60000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
function withinShift(nowMin, s, grace = 0) {
  const st = toMin(s.start_time);
  let en = toMin(s.end_time);
  if (en <= st) en += 1440;
  const a = st - grace;
  const b = en + grace;
  return [nowMin, nowMin + 1440, nowMin - 1440].some((x) => x >= a && x <= b);
}

// null = open that day, otherwise the reason
function offReason(settings, ymd) {
  const dow = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  if ((settings.weekly_off || []).includes(dow)) return "Weekly off";
  const h = (settings.holidays || []).find((x) => x.date === ymd);
  return h ? h.name || "Holiday" : null;
}

function checkDate(v, label = "Date") {
  if (!U.isYmd(v)) throw new AppError(`${label} must be in YYYY-MM-DD format`, 400);
  if (Math.abs(U.diffDays(U.todayIST(), v)) > 800) throw new AppError(`${label} is out of range`, 400);
  return v;
}

/* ---------------- loaders ---------------- */
async function loadHall(venueId, id, tx) {
  const h = isUuid(id) ? await M.LibHall.findOne({ where: { id, venue_id: venueId }, transaction: tx }) : null;
  if (!h) throw new AppError("Hall not found", 404);
  return h;
}
async function loadShift(venueId, id, tx) {
  const s = isUuid(id) ? await M.LibShift.findOne({ where: { id, venue_id: venueId }, transaction: tx }) : null;
  if (!s) throw new AppError("Shift not found", 404);
  return s;
}
async function findStudent(venueId, id, tx) {
  const s = isUuid(id) ? await M.LibStudent.findOne({ where: { id, venue_id: venueId, is_archived: false }, transaction: tx }) : null;
  if (!s) throw new AppError("Student not found", 404);
  return s;
}

/* ---------------- seats ---------------- */
// Throws if the seat is already sold to a shift that overlaps this one.
async function assertSeatFree(tx, venueId, hallId, seatNo, shift, exceptStudentId = null) {
  await lock(tx, `libseat:${hallId}:${seatNo}`);
  const [rows] = await sequelize.query(
    `SELECT a.student_id, sh.name, sh.start_time, sh.end_time, s.name AS student_name
       FROM lib_allocations a
       JOIN lib_shifts sh ON sh.id = a.shift_id
       JOIN lib_students s ON s.id = a.student_id
      WHERE a.venue_id = :v AND a.hall_id = :h AND a.seat_no = :n AND a.status = 'active'`,
    { replacements: { v: venueId, h: hallId, n: seatNo }, transaction: tx }
  );
  const clash = rows.find((r) => r.student_id !== exceptStudentId && shiftsOverlap(shift, r));
  if (clash) {
    throw new AppError(`Seat ${seatNo} is already allotted to ${clash.student_name} in ${clash.name} (${fmt12(clash.start_time)} - ${fmt12(clash.end_time)})`, 409);
  }
}

// Validates hall + shift + seat from a request body and checks the seat is free.
async function resolveSeat(tx, venueId, b, exceptStudentId) {
  if (!isUuid(b.hall_id)) throw new AppError("Choose a hall", 400);
  if (!isUuid(b.shift_id)) throw new AppError("Choose a shift", 400);
  if (blank(b.seat_no)) throw new AppError("Choose a seat", 400);
  const hall = await loadHall(venueId, b.hall_id, tx);
  const shift = await loadShift(venueId, b.shift_id, tx);
  if (!hall.is_active) throw new AppError("This hall is inactive", 400);
  if (!shift.is_active) throw new AppError("This shift is inactive", 400);
  const seatNo = U.num(b.seat_no, "Seat number", { min: 1, max: 9999, int: true });
  if (seatNo < hall.seat_start || seatNo > hall.seat_end || (hall.blocked_seats || []).includes(seatNo)) {
    throw new AppError(`Seat ${seatNo} is not available in ${hall.name}`, 400);
  }
  await assertSeatFree(tx, venueId, hall.id, seatNo, shift, exceptStudentId);
  return { hall, shift, seatNo };
}

async function allocate(tx, venueId, student, pick) {
  await M.LibAllocation.update(
    { status: "released", released_at: new Date() },
    { where: { student_id: student.id, status: "active" }, transaction: tx }
  );
  return M.LibAllocation.create(
    { venue_id: venueId, student_id: student.id, hall_id: pick.hall.id, seat_no: pick.seatNo, shift_id: pick.shift.id, status: "active" },
    { transaction: tx }
  );
}

async function release(tx, studentId) {
  await M.LibAllocation.update({ status: "released", released_at: new Date() }, { where: { student_id: studentId, status: "active" }, transaction: tx });
}

async function currentAllocation(tx, studentId) {
  const a = await M.LibAllocation.findOne({ where: { student_id: studentId, status: "active" }, transaction: tx });
  if (!a) return null;
  const [hall, shift] = await Promise.all([M.LibHall.findByPk(a.hall_id, { transaction: tx }), M.LibShift.findByPk(a.shift_id, { transaction: tx })]);
  return hall && shift ? { ...a.toJSON(), hall, shift } : null;
}

/* ---------------- pricing ---------------- */
function duration(b) {
  const unit = b.duration_unit === "days" ? "days" : "months";
  const raw = blank(b.duration_value) ? (unit === "months" ? 1 : null) : b.duration_value;
  const value = unit === "months"
    ? U.num(raw, "Duration", { min: 1, max: C.LIMITS.maxMonths, int: true })
    : U.num(raw, "Number of days", { min: 1, max: C.LIMITS.maxDays, int: true });
  return { unit, value };
}

// Server-side price. The browser only shows a preview.
function quote(shift, { unit = "months", value = 1, discount = 0, registration = 0 } = {}) {
  const monthly = U.money(shift.price);
  const base = unit === "months" ? U.money(monthly * value) : U.money((monthly * value) / 30);
  const disc = U.money(Math.min(Math.max(Number(discount) || 0, 0), base));
  const reg = U.money(Math.max(Number(registration) || 0, 0));
  return { base, discount: disc, registration: reg, total: U.money(base - disc + reg) };
}

async function createMembership(tx, { venueId, student, pick, kind, start, dur, discount, registration, notes }) {
  const q = quote(pick.shift, { ...dur, discount, registration });
  return M.LibMembership.create({
    venue_id: venueId, student_id: student.id, shift_id: pick.shift.id, shift_name: pick.shift.name,
    hall_name: pick.hall.name, seat_no: pick.seatNo, kind,
    duration_unit: dur.unit, duration_value: dur.value,
    start_date: start, end_date: U.membershipEnd(start, dur.unit, dur.value),
    base_price: q.base, discount_amount: q.discount, registration_fee: q.registration, total_amount: q.total,
    notes: notes ? String(notes).slice(0, 300) : null, status: "active"
  }, { transaction: tx });
}

// Single source of truth for money and the "valid till" date.
async function recompute(tx, studentId) {
  await sequelize.query(
    `UPDATE lib_memberships ms SET amount_paid = COALESCE((
       SELECT SUM(p.amount) FROM lib_payments p WHERE p.membership_id = ms.id AND p.status = 'paid'), 0)
      WHERE ms.student_id = :id`,
    { replacements: { id: studentId }, transaction: tx }
  );
  await sequelize.query(
    `UPDATE lib_students s SET
       balance_due = COALESCE((SELECT SUM(GREATEST(ms.total_amount - ms.amount_paid, 0))
                                 FROM lib_memberships ms WHERE ms.student_id = s.id AND ms.status = 'active'), 0),
       total_paid  = COALESCE((SELECT SUM(p.amount) FROM lib_payments p WHERE p.student_id = s.id AND p.status = 'paid'), 0),
       end_date    = (SELECT MAX(ms.end_date) FROM lib_memberships ms WHERE ms.student_id = s.id AND ms.status = 'active')
     WHERE s.id = :id`,
    { replacements: { id: studentId }, transaction: tx }
  );
}

// Adds days_left + display_status (active | expiring | expired | frozen | left | new) and hides secrets.
function present(student, today = U.todayIST()) {
  const j = typeof student.toJSON === "function" ? student.toJSON() : { ...student };
  delete j.portal_token;
  delete j.aadhaar_enc;
  j.days_left = j.end_date ? U.diffDays(today, j.end_date) : null;
  if (j.status === "left") j.display_status = "left";
  else if (j.status === "frozen") j.display_status = "frozen";
  else if (!j.end_date) j.display_status = "new";
  else if (j.days_left < 0) j.display_status = "expired";
  else if (j.days_left <= C.EXPIRING_DAYS) j.display_status = "expiring";
  else j.display_status = "active";
  return j;
}

module.exports = {
  UUID_RE, isUuid, blank, clean, lock, nextSeq, toMin, fmt12, shiftsOverlap, nowMinIST, withinShift, offReason, checkDate,
  loadHall, loadShift, findStudent, assertSeatFree, resolveSeat, allocate, release, currentAllocation,
  duration, quote, createMembership, recompute, present
};