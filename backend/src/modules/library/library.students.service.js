const { QueryTypes, Op } = require("sequelize");
const { sequelize } = require("../../config/database");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const C = require("./library.constants");
const core = require("./library.core");
const payments = require("./library.payments.service");
const { LibStudent, LibMembership, LibPayment, LibAttendance, LibAllocation, LibHall, LibShift } = require("./library.models");

const ymdOrNull = (v, label) => {
  if (core.blank(v)) return null;
  if (!U.isYmd(v)) throw new AppError(`${label} must be in YYYY-MM-DD format`, 400);
  return v;
};

function studentFields(b, creating) {
  const o = {};
  if (creating || b.name !== undefined) {
    const n = core.clean(b.name, 100);
    if (!n) throw new AppError("Student name is required", 400);
    o.name = n;
  }
  if (creating || b.phone !== undefined) o.phone = U.normalizePhone(b.phone);
  if (b.father_name !== undefined) o.father_name = core.clean(b.father_name, 100);
  if (!core.blank(b.joined_on)) o.joined_on = core.checkDate(b.joined_on, "Joining date");
  if (b.dob !== undefined) o.dob = ymdOrNull(b.dob, "Date of birth");
  if (b.gender !== undefined) o.gender = C.GENDERS.includes(b.gender) ? b.gender : null;
  if (b.email !== undefined) {
    const e = core.clean(b.email, 120);
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new AppError("Enter a valid email", 400);
    o.email = e;
  }
  if (b.address !== undefined) o.address = core.clean(b.address, 500);
  if (b.exam_preparing !== undefined) o.exam_preparing = core.clean(b.exam_preparing, 100);
  if (b.emergency_phone !== undefined) o.emergency_phone = core.blank(b.emergency_phone) ? null : U.normalizePhone(b.emergency_phone);
  if (b.notes !== undefined) o.notes = core.clean(b.notes, 500);
  if (b.aadhaar !== undefined) {
    const d = String(b.aadhaar || "").replace(/\s/g, "");
    if (!d) { o.aadhaar_last4 = null; o.aadhaar_enc = null; }
    else if (/^\d{12}$/.test(d)) { o.aadhaar_last4 = d.slice(-4); o.aadhaar_enc = U.encrypt(d); }
    else throw new AppError("Aadhaar number must be 12 digits", 400);
  }
  return o;
}

async function assertPhoneFree(venueId, phone, exceptId, tx) {
  const where = { venue_id: venueId, phone, is_archived: false };
  if (exceptId) where.id = { [Op.ne]: exceptId };
  const dup = await LibStudent.findOne({ where, transaction: tx });
  if (dup) throw new AppError(`A student with this phone already exists: ${dup.name} (${dup.student_code})`, 409);
}

/* ---------------- list / export ---------------- */
const SORTS = { name: "s.name ASC", end_date: "s.end_date ASC NULLS LAST", newest: "s.created_at DESC", dues: "s.balance_due DESC" };

function buildWhere(venueId, q) {
  const today = U.todayIST();
  const repl = { v: venueId, today, in7: U.addDays(today, C.EXPIRING_DAYS) };
  let where = "s.venue_id = :v AND s.is_archived = false";
  const st = String(q.status || "");
  if (st === "active") where += " AND s.status = 'active' AND s.end_date >= :today";
  else if (st === "expiring") where += " AND s.status = 'active' AND s.end_date BETWEEN :today AND :in7";
  else if (st === "expired") where += " AND s.status = 'active' AND s.end_date < :today";
  else if (st === "frozen") where += " AND s.status = 'frozen'";
  else if (st === "left") where += " AND s.status = 'left'";
  else if (st === "dues") where += " AND s.balance_due > 0";
  if (core.isUuid(q.hall_id)) { where += " AND a.hall_id = :hall"; repl.hall = q.hall_id; }
  if (core.isUuid(q.shift_id)) { where += " AND a.shift_id = :shift"; repl.shift = q.shift_id; }
  if (!core.blank(q.q)) {
    where += " AND (s.name ILIKE :like OR s.phone ILIKE :like OR s.student_code ILIKE :like OR s.father_name ILIKE :like)";
    repl.like = `%${U.likeEscape(q.q)}%`;
  }
  return { where, repl };
}

const FROM = `FROM lib_students s
  LEFT JOIN lib_allocations a ON a.student_id = s.id AND a.status = 'active'
  LEFT JOIN lib_halls h ON h.id = a.hall_id
  LEFT JOIN lib_shifts sh ON sh.id = a.shift_id`;
const COLS = `s.id, s.student_code, s.name, s.phone, s.photo_url, s.father_name, s.joined_on, s.status, s.end_date,
  s.balance_due::float AS balance_due, s.total_paid::float AS total_paid,
  a.hall_id, a.seat_no, a.shift_id, h.name AS hall_name, sh.name AS shift_name, sh.start_time, sh.end_time`;

async function counts(venueId) {
  const today = U.todayIST();
  const [row] = await sequelize.query(
    `SELECT COUNT(*)::int AS all,
       COUNT(*) FILTER (WHERE status = 'active' AND end_date >= :today)::int AS active,
       COUNT(*) FILTER (WHERE status = 'active' AND end_date BETWEEN :today AND :in7)::int AS expiring,
       COUNT(*) FILTER (WHERE status = 'active' AND end_date < :today)::int AS expired,
       COUNT(*) FILTER (WHERE status = 'frozen')::int AS frozen,
       COUNT(*) FILTER (WHERE status = 'left')::int AS "left",
       COUNT(*) FILTER (WHERE balance_due > 0)::int AS dues
     FROM lib_students WHERE venue_id = :v AND is_archived = false`,
    { replacements: { v: venueId, today, in7: U.addDays(today, C.EXPIRING_DAYS) }, type: QueryTypes.SELECT }
  );
  return row;
}

async function list(venueId, q = {}) {
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), 100);
  const { where, repl } = buildWhere(venueId, q);
  const order = SORTS[q.sort] || SORTS.name;
  const [rows, [tot], summary] = await Promise.all([
    sequelize.query(`SELECT ${COLS} ${FROM} WHERE ${where} ORDER BY ${order}, s.id LIMIT :limit OFFSET :offset`,
      { replacements: { ...repl, limit, offset: (page - 1) * limit }, type: QueryTypes.SELECT }),
    sequelize.query(`SELECT COUNT(*)::int AS n ${FROM} WHERE ${where}`, { replacements: repl, type: QueryTypes.SELECT }),
    counts(venueId)
  ]);
  const today = U.todayIST();
  return { items: rows.map((r) => core.present(r, today)), total: tot.n, page, limit, counts: summary };
}

const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // blocks spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function exportCsv(venueId, q = {}) {
  const { where, repl } = buildWhere(venueId, q);
  const rows = await sequelize.query(`SELECT ${COLS} ${FROM} WHERE ${where} ORDER BY s.name ASC LIMIT 5000`, { replacements: repl, type: QueryTypes.SELECT });
  const today = U.todayIST();
  const head = ["Student ID", "Name", "Phone", "Father name", "Hall", "Seat", "Shift", "Joined on", "Valid till", "Status", "Balance due", "Total paid"];
  const lines = [head.join(",")];
  rows.forEach((r) => {
    const p = core.present(r, today);
    lines.push([r.student_code, r.name, r.phone, r.father_name, r.hall_name, r.seat_no, r.shift_name, r.joined_on, r.end_date, p.display_status, r.balance_due, r.total_paid].map(csvCell).join(","));
  });
  return `\uFEFF${lines.join("\n")}`;
}

/* ---------------- enrol ---------------- */
async function enroll(ctx, b) {
  const { venue, settings } = ctx;
  const f = studentFields(b, true);
  const today = U.todayIST();
  const joined = f.joined_on || today;
  const dur = core.duration(b);
  const start = core.blank(b.start_date) ? joined : core.checkDate(b.start_date, "Start date");

  return sequelize.transaction(async (tx) => {
    const codeNo = await core.nextSeq(tx, venue.id, "lib_students", "code_no");
 
    const pick = await core.resolveSeat(tx, venue.id, b, null);

    const student = await LibStudent.create({
      ...f, venue_id: venue.id, code_no: codeNo, student_code: `S${String(codeNo).padStart(4, "0")}`,
      joined_on: joined, portal_token: U.token(), status: "active"
    }, { transaction: tx });
    await core.allocate(tx, venue.id, student, pick);

    const registration = core.blank(b.registration_fee)
      ? Number(settings.registration_fee) || 0
      : U.num(b.registration_fee, "Registration fee", { max: 1000000 });
    const membership = await core.createMembership(tx, { venueId: venue.id, student, pick, kind: "new", start, dur, discount: b.discount, registration, notes: b.fee_note });

    let payment = null;
    const pay = b.payment || {};
    if (!core.blank(pay.amount) && Number(pay.amount) > 0) {
      payment = await payments.recordTx(tx, ctx, { student, membership, amount: pay.amount, mode: pay.mode, reference: pay.reference, note: pay.note, paid_on: pay.paid_on });
    }
    await core.recompute(tx, student.id);
    await student.reload({ transaction: tx });
    return { student: core.present(student), membership, payment };
  });
}

/* ---------------- renew / move / freeze / leave ---------------- */
async function renew(ctx, id, b) {
  const { venue } = ctx;
  const today = U.todayIST();
  const dur = core.duration(b);

  return sequelize.transaction(async (tx) => {
    await core.lock(tx, `libstu:${id}`);
    const student = await core.findStudent(venue.id, id, tx);
    if (student.status === "frozen") throw new AppError("Unfreeze this student before renewing", 400);

    const cur = await core.currentAllocation(tx, student.id);
    const wantsSeat = !!(b.hall_id || b.shift_id || b.seat_no);
    let pick;
    if (wantsSeat || !cur) {
      if (!wantsSeat) throw new AppError("This student has no seat. Choose a hall, shift and seat to renew", 400);
      pick = await core.resolveSeat(tx, venue.id, b, student.id);
      await core.allocate(tx, venue.id, student, pick);
    } else {
      pick = { hall: cur.hall, shift: cur.shift, seatNo: cur.seat_no };
    }

    const start = !core.blank(b.start_date)
      ? core.checkDate(b.start_date, "Start date")
      : (student.end_date && student.end_date >= today ? U.addDays(student.end_date, 1) : today);
    const membership = await core.createMembership(tx, { venueId: venue.id, student, pick, kind: "renewal", start, dur, discount: b.discount, registration: 0, notes: b.fee_note });
    await student.update({ status: "active", frozen_on: null }, { transaction: tx });

    let payment = null;
    const pay = b.payment || {};
    if (!core.blank(pay.amount) && Number(pay.amount) > 0) {
      payment = await payments.recordTx(tx, ctx, { student, membership, amount: pay.amount, mode: pay.mode, reference: pay.reference, note: pay.note, paid_on: pay.paid_on });
    }
    await core.recompute(tx, student.id);
    await student.reload({ transaction: tx });
    return { student: core.present(student), membership, payment };
  });
}

// Change hall / seat / shift. The fee already paid is unchanged; the new shift's price applies from the next renewal.
async function move(ctx, id, b) {
  return sequelize.transaction(async (tx) => {
    await core.lock(tx, `libstu:${id}`);
    const student = await core.findStudent(ctx.venue.id, id, tx);
    if (student.status === "left") throw new AppError("This student has left. Renew to give a seat again", 400);
    const pick = await core.resolveSeat(tx, ctx.venue.id, b, student.id);
    await core.allocate(tx, ctx.venue.id, student, pick);
    await sequelize.query(
      `UPDATE lib_memberships SET shift_id = :s, shift_name = :sn, hall_name = :hn, seat_no = :no
        WHERE id = (SELECT id FROM lib_memberships WHERE student_id = :st AND status = 'active' ORDER BY start_date DESC LIMIT 1)`,
      { replacements: { s: pick.shift.id, sn: pick.shift.name, hn: pick.hall.name, no: pick.seatNo, st: student.id }, transaction: tx }
    );
    return { moved: true, hall: pick.hall.name, shift: pick.shift.name, seat_no: pick.seatNo };
  });
}

async function freeze(venueId, id) {
  return sequelize.transaction(async (tx) => {
    await core.lock(tx, `libstu:${id}`);
    const s = await core.findStudent(venueId, id, tx);
    if (s.status !== "active") throw new AppError("Only an active student can be frozen", 400);
    await s.update({ status: "frozen", frozen_on: U.todayIST() }, { transaction: tx });
    return core.present(s);
  });
}

// Unfreezing pushes the end date forward by the days the student was frozen.
async function unfreeze(venueId, id) {
  return sequelize.transaction(async (tx) => {
    await core.lock(tx, `libstu:${id}`);
    const s = await core.findStudent(venueId, id, tx);
    if (s.status !== "frozen") throw new AppError("This student is not frozen", 400);
    const days = Math.max(U.diffDays(s.frozen_on || U.todayIST(), U.todayIST()), 0);
    if (days > 0) {
      const ms = await LibMembership.findOne({ where: { student_id: s.id, status: "active" }, order: [["end_date", "DESC"]], transaction: tx });
      if (ms) await ms.update({ end_date: U.addDays(ms.end_date, days) }, { transaction: tx });
    }
    await s.update({ status: "active", frozen_on: null }, { transaction: tx });
    await core.recompute(tx, s.id);
    await s.reload({ transaction: tx });
    return core.present(s);
  });
}

// Student stops coming: the seat is released, all records are kept.
async function leave(venueId, id) {
  return sequelize.transaction(async (tx) => {
    await core.lock(tx, `libstu:${id}`);
    const s = await core.findStudent(venueId, id, tx);
    await core.release(tx, s.id);
    await s.update({ status: "left", frozen_on: null }, { transaction: tx });
    return core.present(s);
  });
}

async function archive(venueId, id) {
  return sequelize.transaction(async (tx) => {
    await core.lock(tx, `libstu:${id}`);
    const s = await core.findStudent(venueId, id, tx);
    await core.release(tx, s.id);
    await s.update({ is_archived: true, status: "left" }, { transaction: tx });
    return { archived: true };
  });
}

async function removePermanent(venueId, id, confirm) {
  return sequelize.transaction(async (tx) => {
    const s = await core.findStudent(venueId, id, tx);
    if (String(confirm || "").trim().toUpperCase() !== s.student_code) throw new AppError(`Type the student ID (${s.student_code}) to confirm`, 400);
    for (const Model of [LibAttendance, LibPayment, LibMembership, LibAllocation]) await Model.destroy({ where: { student_id: s.id }, transaction: tx });
    await s.destroy({ transaction: tx });
    return { deleted: true };
  });
}

/* ---------------- update / detail ---------------- */
async function update(ctx, id, b) {
  const s = await core.findStudent(ctx.venue.id, id);
  const f = studentFields(b, false);
  await s.update(f);
  return core.present(s);
}

async function setPhoto(venueId, id, url) {
  const s = await core.findStudent(venueId, id);
  await s.update({ photo_url: url });
  return core.present(s);
}

async function revealAadhaar(venueId, id) {
  const s = await core.findStudent(venueId, id);
  if (!s.aadhaar_enc) throw new AppError("No Aadhaar number saved", 404);
  return { aadhaar: U.decrypt(s.aadhaar_enc) };
}

async function detail(ctx, id) {
  const s = await core.findStudent(ctx.venue.id, id);
  const month = U.todayIST().slice(0, 7);
  const [[alloc], memberships, pays, [att]] = await Promise.all([
    sequelize.query(
      `SELECT a.hall_id, a.seat_no, a.shift_id, h.name AS hall_name, sh.name AS shift_name, sh.start_time, sh.end_time, sh.price::float AS shift_price
         FROM lib_allocations a JOIN lib_halls h ON h.id = a.hall_id JOIN lib_shifts sh ON sh.id = a.shift_id
        WHERE a.student_id = :s AND a.status = 'active'`,
      { replacements: { s: s.id }, type: QueryTypes.SELECT }).then((r) => (r.length ? r : [null])),
    LibMembership.findAll({ where: { student_id: s.id }, order: [["start_date", "DESC"], ["createdAt", "DESC"]], limit: 50 }),
    LibPayment.findAll({ where: { student_id: s.id }, order: [["paid_on", "DESC"], ["receipt_seq", "DESC"]], limit: 100 }),
    sequelize.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'present')::int AS present FROM lib_attendance WHERE student_id = :s AND to_char(att_date, 'YYYY-MM') = :m`,
      { replacements: { s: s.id, m: month }, type: QueryTypes.SELECT })
  ]);
  const student = core.present(s);
  student.aadhaar_masked = s.aadhaar_last4 ? `XXXX XXXX ${s.aadhaar_last4}` : null;
  return { student, allocation: alloc || null, memberships, payments: pays, attendance_this_month: att ? att.present : 0 };
}

/* ---------------- bulk import from a spreadsheet ---------------- */
// Accepts YYYY-MM-DD, DD/MM/YYYY or DD-MM-YYYY. Returns null if blank.
function toYmd(v) {
    const s = String(v == null ? "" : v).trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    throw new AppError(`Date "${s}" is not valid. Use DD/MM/YYYY`, 400);
  }
  
  // One student per row, each in its own transaction, so one bad row never blocks the others.
  // Registration fee defaults to 0 here (these students already joined).
  async function importRows(ctx, rows) {
    if (!Array.isArray(rows) || !rows.length) throw new AppError("The file has no rows", 400);
    if (rows.length > 300) throw new AppError("Import up to 300 students at a time", 400);
    const [halls, shifts] = await Promise.all([
      LibHall.findAll({ where: { venue_id: ctx.venue.id } }),
      LibShift.findAll({ where: { venue_id: ctx.venue.id } })
    ]);
    const hallBy = new Map(halls.map((h) => [h.name.trim().toLowerCase(), h]));
    const shiftBy = new Map(shifts.map((s) => [s.name.trim().toLowerCase(), s]));
    const results = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      try {
        const hall = hallBy.get(String(r.hall || "").trim().toLowerCase());
        if (!hall) throw new AppError(`Hall "${r.hall || ""}" was not found. Create it first`, 400);
        const shift = shiftBy.get(String(r.shift || "").trim().toLowerCase());
        if (!shift) throw new AppError(`Shift "${r.shift || ""}" was not found. Create it first`, 400);
        const body = {
          name: r.name, phone: r.phone, father_name: r.father_name, address: r.address, email: r.email, exam_preparing: r.exam_preparing,
          aadhaar: r.aadhaar, dob: toYmd(r.dob) || undefined, gender: r.gender ? String(r.gender).toLowerCase() : undefined,
          hall_id: hall.id, shift_id: shift.id, seat_no: r.seat,
          duration_unit: "months", duration_value: core.blank(r.months) ? 1 : r.months,
          joined_on: toYmd(r.joined_on) || undefined, start_date: toYmd(r.start_date) || toYmd(r.joined_on) || undefined,
          discount: core.blank(r.discount) ? 0 : r.discount,
          registration_fee: core.blank(r.registration_fee) ? 0 : r.registration_fee
        };
        if (!core.blank(r.amount_paid) && Number(r.amount_paid) > 0) {
          body.payment = { amount: r.amount_paid, mode: String(r.payment_mode || "cash").toLowerCase().replace(/\s+/g, "_"), paid_on: toYmd(r.paid_on) || undefined };
        }
        const out = await enroll(ctx, body);
        results.push({ row: i + 2, ok: true, student_code: out.student.student_code });
      } catch (e) { results.push({ row: i + 2, ok: false, error: e.message || "Could not import this row" }); }
    }
    return { created: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }
  module.exports = { list, counts, exportCsv, enroll, renew, move, freeze, unfreeze, leave, archive, removePermanent, update, setPhoto, revealAadhaar, detail, importRows };