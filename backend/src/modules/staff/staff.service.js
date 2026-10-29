const { Op } = require("sequelize");
const { sequelize } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const core = require("../gym/gym.core");
const { GymStaff, GymStaffAttendance, GymStaffPayroll, GymStaffPayment } = require("./staff.models");
const K = require("./staff.calc");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECEIPT_PREFIX = "SAL";
const MAX_BACK_DAYS = 120;
const text = (v, max) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max) || null;

const assertId = (id) => {
  if (!UUID_RE.test(String(id))) throw new AppError("Staff member not found", 404);
  return id;
};

async function findStaff(venueId, id, tx) {
  const s = await GymStaff.findOne({ where: { id: assertId(id), venue_id: venueId }, transaction: tx });
  if (!s) throw new AppError("Staff member not found", 404);
  return s;
}

function assertMonth(m) {
  if (!K.isYm(m)) throw new AppError("Month must be in YYYY-MM format", 400);
  if (m > K.currentMonth()) throw new AppError("This month has not started yet", 400);
  if (m < "2020-01") throw new AppError("Month is out of range", 400);
  return m;
}

function assertDay(date, label = "Date") {
  if (!U.isYmd(date)) throw new AppError(`${label} must be in YYYY-MM-DD format`, 400);
  const today = U.todayIST();
  if (date > today) throw new AppError(`${label} cannot be in the future`, 400);
  if (U.diffDays(date, today) > MAX_BACK_DAYS) throw new AppError(`${label} is too old (up to ${MAX_BACK_DAYS} days back)`, 400);
  return date;
}

function fields(b, isNew) {
  const o = {};
  const has = (k) => isNew || b[k] !== undefined;
  const blank = (v) => v === "" || v === null || v === undefined;
  if (has("name")) {
    const v = text(b.name, 100);
    if (!v || v.length < 2) throw new AppError("Enter the staff member's name", 400);
    o.name = v;
  }
  if (has("phone")) o.phone = U.normalizePhone(b.phone);
  if (has("email")) {
    const v = text(b.email, 120);
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new AppError("Enter a valid email address", 400);
    o.email = v ? v.toLowerCase() : null;
  }
  if (has("joining_date")) {
    if (!U.isYmd(b.joining_date)) throw new AppError("Joining date must be in YYYY-MM-DD format", 400);
    if (b.joining_date < "2000-01-01" || b.joining_date > U.addDays(U.todayIST(), 31)) throw new AppError("Joining date is out of range", 400);
    o.joining_date = b.joining_date;
  }
  if (has("monthly_salary")) o.monthly_salary = U.money(U.num(b.monthly_salary, "Monthly salary", { min: 1, max: 10000000 }));
  if (has("deduction_per_day")) o.deduction_per_day = blank(b.deduction_per_day) ? 0 : U.money(U.num(b.deduction_per_day, "Deduction per day", { min: 0, max: 1000000 }));
  if (has("free_leave_days")) o.free_leave_days = blank(b.free_leave_days) ? 0 : Math.round(U.num(b.free_leave_days, "Free leave days", { min: 0, max: 31 }) * 2) / 2;
  if (has("weekly_off_days")) {
    const arr = Array.isArray(b.weekly_off_days) ? b.weekly_off_days.map(Number) : [];
    if (arr.some((n) => !Number.isInteger(n) || n < 0 || n > 6)) throw new AppError("Weekly off days are invalid", 400);
    o.weekly_off_days = [...new Set(arr)].sort();
  }
  if (has("designation")) o.designation = text(b.designation, 60);
  if (has("shift_timing")) o.shift_timing = text(b.shift_timing, 40);
  if (has("address")) o.address = text(b.address, 300);
  if (has("emergency_contact")) o.emergency_contact = text(b.emergency_contact, 60);
  if (has("upi_id")) o.upi_id = text(b.upi_id, 80);
  if (has("notes")) o.notes = text(b.notes, 500);
  return o;
}

async function assertPhoneFree(venueId, phone, exceptId) {
  const where = { venue_id: venueId, phone, is_active: true };
  if (exceptId) where.id = { [Op.ne]: exceptId };
  if (await GymStaff.findOne({ where, attributes: ["id"] })) throw new AppError("An active staff member already has this mobile number", 409);
}

const brief = (s) => ({ id: s.id, staff_code: s.staff_code, name: s.name, designation: s.designation, phone: s.phone, upi_id: s.upi_id, is_active: s.is_active });

/* ---------------- staff ---------------- */
async function list(venueId, q = {}) {
  const where = { venue_id: venueId };
  if (q.status === "inactive") where.is_active = false;
  else if (q.status !== "all") where.is_active = true;
  const term = String(q.search || "").trim();
  if (term) {
    const like = `%${U.likeEscape(term)}%`;
    where[Op.or] = [{ name: { [Op.iLike]: like } }, { phone: { [Op.iLike]: like } }, { staff_code: { [Op.iLike]: like } }, { designation: { [Op.iLike]: like } }];
  }
  const rows = await GymStaff.findAll({ where, order: [["is_active", "DESC"], ["name", "ASC"]], limit: 500 });
  const today = U.todayIST();
  const marks = rows.length ? await GymStaffAttendance.findAll({ where: { venue_id: venueId, date: today, staff_id: rows.map((r) => r.id) }, attributes: ["staff_id", "status"] }) : [];
  const byStaff = new Map(marks.map((m) => [m.staff_id, m.status]));
  return rows.map((r) => {
    const off = (r.weekly_off_days || []).includes(K.weekday(today));
    return { ...r.toJSON(), today_status: byStaff.get(r.id) || (off ? "week_off" : null) };
  });
}

async function create({ venue }, b) {
  const f = fields(b || {}, true);
  await assertPhoneFree(venue.id, f.phone);
  return sequelize.transaction(async (tx) => {
    const seq = await core.nextSeq(tx, venue.id, "gym_staff", "seq");
    return GymStaff.create({ ...f, venue_id: venue.id, seq, staff_code: `S${String(seq).padStart(3, "0")}` }, { transaction: tx });
  });
}

async function update(venueId, id, b = {}) {
  const s = await findStaff(venueId, id);
  const f = fields(b, false);
  if (f.phone && f.phone !== s.phone) await assertPhoneFree(venueId, f.phone, s.id);
  if (b.is_active === false) {
    f.is_active = false;
    f.left_date = b.left_date && U.isYmd(b.left_date) ? b.left_date : s.left_date || U.todayIST();
  } else if (b.is_active === true) {
    if (!s.is_active) await assertPhoneFree(venueId, f.phone || s.phone, s.id);
    f.is_active = true;
    f.left_date = null;
  }
  const joined = f.joining_date || s.joining_date;
  if (f.left_date && f.left_date < joined) throw new AppError("Leaving date cannot be before the joining date", 400);
  await s.update(f);
  return s;
}

// Staff with attendance or salary history are kept (marked as left), so past payroll never changes.
async function remove(venueId, id) {
  const s = await findStaff(venueId, id);
  const [att, pay, adj] = await Promise.all([
    GymStaffAttendance.count({ where: { staff_id: s.id } }),
    GymStaffPayment.count({ where: { staff_id: s.id } }),
    GymStaffPayroll.count({ where: { staff_id: s.id } })
  ]);
  if (att + pay + adj > 0) {
    await s.update({ is_active: false, left_date: s.left_date || U.todayIST() });
    return { archived: true };
  }
  await s.destroy();
  return { deleted: true };
}

/* ---------------- attendance ---------------- */
const worksOn = (s, date) => String(s.joining_date) <= date && (!s.left_date || String(s.left_date) >= date);

async function getAttendance(venueId, date) {
  const day = assertDay(date || U.todayIST());
  const staff = await GymStaff.findAll({
    where: {
      venue_id: venueId,
      joining_date: { [Op.lte]: day },
      [Op.or]: [{ is_active: true, left_date: null }, { left_date: { [Op.gte]: day } }]
    },
    order: [["name", "ASC"]]
  });
  const marks = staff.length ? await GymStaffAttendance.findAll({ where: { venue_id: venueId, date: day, staff_id: staff.map((s) => s.id) } }) : [];
  const byStaff = new Map(marks.map((m) => [m.staff_id, m]));
  const dow = K.weekday(day);
  const counts = { present: 0, absent: 0, half_day: 0, paid_leave: 0, holiday: 0, week_off: 0, unmarked: 0 };
  const rows = staff.map((s) => {
    const m = byStaff.get(s.id);
    const isOff = (s.weekly_off_days || []).includes(dow);
    if (m) counts[m.status] += 1;
    else if (isOff) counts.week_off += 1;
    else counts.unmarked += 1;
    return { id: s.id, staff_code: s.staff_code, name: s.name, designation: s.designation, shift_timing: s.shift_timing, is_week_off: isOff, status: m ? m.status : null, note: m ? m.note : null };
  });
  return { date: day, rows, counts };
}

async function markAttendance({ venue, user }, b = {}) {
  const day = assertDay(b.date);
  const entries = Array.isArray(b.entries) ? b.entries : [];
  if (!entries.length) throw new AppError("Nothing to save", 400);
  if (entries.length > 300) throw new AppError("Too many entries in one request", 400);
  const ids = [...new Set(entries.map((e) => assertId(e && e.staff_id)))];
  const staff = await GymStaff.findAll({ where: { venue_id: venue.id, id: ids } });
  const byId = new Map(staff.map((s) => [s.id, s]));

  const plan = entries.map((e) => {
    const s = byId.get(e.staff_id);
    if (!s) throw new AppError("Staff member not found", 404);
    if (!worksOn(s, day)) throw new AppError(`${s.name} was not working on this date`, 400);
    const status = e.status === null || e.status === "" || e.status === undefined ? null : e.status;
    if (status !== null && !K.STATUSES.includes(status)) throw new AppError("Invalid attendance status", 400);
    return { staff_id: s.id, status, note: text(e.note, 120) };
  });

  await sequelize.transaction(async (tx) => {
    const existing = await GymStaffAttendance.findAll({ where: { venue_id: venue.id, date: day, staff_id: ids }, transaction: tx });
    const cur = new Map(existing.map((r) => [r.staff_id, r]));
    for (const p of plan) {
      const row = cur.get(p.staff_id);
      if (p.status === null) {
        if (row) await row.destroy({ transaction: tx });
      } else if (row) {
        await row.update({ status: p.status, note: p.note, marked_by: user.name }, { transaction: tx });
      } else {
        await GymStaffAttendance.create({ venue_id: venue.id, staff_id: p.staff_id, date: day, status: p.status, note: p.note, marked_by: user.name }, { transaction: tx });
      }
    }
  });
  return getAttendance(venue.id, day);
}

/* ---------------- payroll ---------------- */
async function figures(venueId, staffIds, month, tx) {
  const opt = tx ? { transaction: tx } : {};
  const att = await GymStaffAttendance.findAll({ where: { venue_id: venueId, staff_id: staffIds, date: { [Op.between]: [K.monthStart(month), K.monthEnd(month)] } }, attributes: ["staff_id", "date", "status"], ...opt });
  const adjs = await GymStaffPayroll.findAll({ where: { venue_id: venueId, staff_id: staffIds, month }, ...opt });
  const pays = await GymStaffPayment.findAll({ where: { venue_id: venueId, staff_id: staffIds, month, status: "paid" }, attributes: ["staff_id", "amount"], ...opt });
  const records = new Map();
  att.forEach((r) => { if (!records.has(r.staff_id)) records.set(r.staff_id, []); records.get(r.staff_id).push(r); });
  const paid = new Map();
  pays.forEach((p) => paid.set(p.staff_id, U.money((paid.get(p.staff_id) || 0) + Number(p.amount))));
  return { records, adj: new Map(adjs.map((a) => [a.staff_id, a])), paid };
}

function line(s, month, f, today) {
  const calc = K.computeMonth(s, month, f.records.get(s.id) || [], f.adj.get(s.id), today);
  const paid = f.paid.get(s.id) || 0;
  return { staff: brief(s), calc, paid, balance: U.money(calc.net_amount - paid), status: K.payStatus(calc.net_amount, paid) };
}

async function payroll(venueId, rawMonth, tx) {
  const month = assertMonth(rawMonth || K.currentMonth());
  const staff = await GymStaff.findAll({
    where: { venue_id: venueId, joining_date: { [Op.lte]: K.monthEnd(month) }, [Op.or]: [{ left_date: null }, { left_date: { [Op.gte]: K.monthStart(month) } }] },
    order: [["name", "ASC"]],
    transaction: tx
  });
  const f = staff.length ? await figures(venueId, staff.map((s) => s.id), month, tx) : { records: new Map(), adj: new Map(), paid: new Map() };
  const today = U.todayIST();
  const rows = staff.map((s) => line(s, month, f, today)).filter((r) => r.calc.employed);
  const sum = (fn) => U.money(rows.reduce((a, r) => a + fn(r), 0));
  return {
    month,
    rows,
    totals: {
      staff_count: rows.length,
      net: sum((r) => r.calc.net_amount),
      paid: sum((r) => r.paid),
      pending: sum((r) => Math.max(r.balance, 0)),
      pending_count: rows.filter((r) => r.balance > 0.009).length
    }
  };
}

async function staffMonth(venueId, id, rawMonth) {
  const s = await findStaff(venueId, id);
  const month = assertMonth(rawMonth || K.currentMonth());
  const [f, records, payments] = await Promise.all([
    figures(venueId, [s.id], month),
    GymStaffAttendance.findAll({ where: { staff_id: s.id, date: { [Op.between]: [K.monthStart(month), K.monthEnd(month)] } }, attributes: ["date", "status", "note"], order: [["date", "ASC"]] }),
    GymStaffPayment.findAll({ where: { staff_id: s.id, month }, order: [["createdAt", "DESC"]], attributes: { exclude: ["snapshot"] } })
  ]);
  return { staff: s.toJSON(), ...line(s, month, f, U.todayIST()), attendance: records, payments };
}

async function setAdjustment(venueId, id, b = {}) {
  const s = await findStaff(venueId, id);
  const month = assertMonth(b.month);
  const bonus = U.money(U.num(b.bonus || 0, "Bonus", { min: 0, max: 10000000 }));
  const other = U.money(U.num(b.other_deduction || 0, "Deduction", { min: 0, max: 10000000 }));
  const note = text(b.note, 200);
  const row = await GymStaffPayroll.findOne({ where: { staff_id: s.id, month } });
  if (!bonus && !other && !note) {
    if (row) await row.destroy();
  } else if (row) {
    await row.update({ bonus, other_deduction: other, note });
  } else {
    await GymStaffPayroll.create({ venue_id: venueId, staff_id: s.id, month, bonus, other_deduction: other, note });
  }
  return staffMonth(venueId, id, month);
}

// One salary payment inside a transaction; locks staff + month so two taps can never overpay.
async function payTx(tx, { venue, user, staff, month, amount, mode, paidOn, reference, notes }) {
  await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:k))", { replacements: { k: `staffpay:${staff.id}:${month}` }, transaction: tx });
  const f = await figures(venue.id, [staff.id], month, tx);
  const ln = line(staff, month, f, U.todayIST());
  if (amount > ln.balance + 0.009) throw new AppError(`Amount exceeds the balance of ₹${U.inr(Math.max(ln.balance, 0))}`, 400);
  const seq = await core.nextSeq(tx, venue.id, "gym_staff_payments", "receipt_seq");
  return GymStaffPayment.create({
    venue_id: venue.id, staff_id: staff.id, month, amount: U.money(amount), mode, status: "paid", paid_on: paidOn,
    reference: text(reference, 80), notes: text(notes, 300), receipt_seq: seq, receipt_no: `${RECEIPT_PREFIX}-${String(seq).padStart(5, "0")}`,
    paid_by: user.name, snapshot: { calc: ln.calc, paid_before: ln.paid, balance_after: U.money(ln.balance - amount) }
  }, { transaction: tx });
}

function payInput(b) {
  const mode = b.mode === undefined || b.mode === "" ? "cash" : b.mode;
  if (!K.MODES.includes(mode)) throw new AppError("Invalid payment mode", 400);
  const paidOn = b.paid_on ? assertDay(b.paid_on, "Payment date") : U.todayIST();
  return { mode, paidOn };
}

async function recordPayment({ venue, user }, id, b = {}) {
  const month = assertMonth(b.month);
  const amount = U.num(b.amount, "Amount", { min: 0.01, max: 10000000 });
  const { mode, paidOn } = payInput(b);
  const staff = await findStaff(venue.id, id);
  const payment = await sequelize.transaction((tx) =>
    payTx(tx, { venue, user, staff, month, amount, mode, paidOn, reference: b.reference, notes: b.notes }));
  return { payment, ...(await staffMonth(venue.id, staff.id, month)) };
}

async function payAll({ venue, user }, b = {}) {
  const month = assertMonth(b.month);
  const { mode, paidOn } = payInput(b);
  return sequelize.transaction(async (tx) => {
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:k))", { replacements: { k: `staffpayall:${venue.id}:${month}` }, transaction: tx });
    const data = await payroll(venue.id, month, tx);
    let count = 0;
    let total = 0;
    for (const r of data.rows) {
      if (r.balance <= 0.009) continue;
      const staff = await GymStaff.findOne({ where: { id: r.staff.id, venue_id: venue.id }, transaction: tx });
      await payTx(tx, { venue, user, staff, month, amount: r.balance, mode, paidOn, reference: b.reference, notes: "Bulk salary payment" });
      count += 1;
      total = U.money(total + r.balance);
    }
    return { month, paid_count: count, total };
  });
}

async function cancelPayment(venueId, id, b = {}) {
  const p = await GymStaffPayment.findOne({ where: { id: assertId(id), venue_id: venueId } });
  if (!p) throw new AppError("Payment not found", 404);
  if (p.status !== "paid") throw new AppError("This payment is already cancelled", 409);
  const reason = text(b.reason, 200);
  if (!reason) throw new AppError("Please write the reason for cancelling", 400);
  await p.update({ status: "cancelled", cancelled_at: new Date(), cancel_reason: reason });
  return staffMonth(venueId, p.staff_id, p.month);
}

module.exports = {
  list, create, update, remove, getAttendance, markAttendance, payroll, staffMonth, setAdjustment, recordPayment, payAll, cancelPayment, findStaff, assertId
};