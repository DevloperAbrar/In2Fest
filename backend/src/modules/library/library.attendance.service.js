const crypto = require("crypto");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const { QueryTypes } = require("sequelize");
const env = require("../../config/env");
const { sequelize } = require("../../config/database");
const { AppError } = require("../../middleware/error.middleware");
const { Venue } = require("../../database/models");
const U = require("../gym/gym.utils");
const { gymIdentity } = require("../gym/gym.brand");
const core = require("./library.core");
const { LibAttendance, LibSettings, LibStudent, LibMembership, LibAllocation, LibShift } = require("./library.models");
const insights = require("./library.insights.service");

const WINDOW_MS = 60 * 1000;
const run = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const markedBy = (user) => String((user && (user.name || user.email)) || "Owner").slice(0, 80);

/* ===================== owner screens ===================== */
// Students who should be in the library on a date (active membership + a seat).
async function day(venueId, settings, date, shiftId) {
  const today = U.todayIST();
  const d = U.isYmd(date) ? date : today;
  const repl = { v: venueId, d };
  let shiftCond = "";
  if (core.isUuid(shiftId)) { shiftCond = "AND a.shift_id = :shift"; repl.shift = shiftId; }
  const rows = await run(
    `SELECT s.id, s.student_code, s.name, s.phone, s.photo_url, h.name AS hall_name, a.seat_no, sh.name AS shift_name, sh.start_time, sh.end_time,
            t.status AS mark, t.check_in_at, t.check_out_at, t.source
       FROM lib_students s
       JOIN lib_allocations a ON a.student_id = s.id AND a.status = 'active'
       JOIN lib_halls h ON h.id = a.hall_id
       JOIN lib_shifts sh ON sh.id = a.shift_id
       LEFT JOIN lib_attendance t ON t.student_id = s.id AND t.att_date = CAST(:d AS date)
      WHERE s.venue_id = :v AND s.is_archived = false AND s.status = 'active' ${shiftCond}
        AND EXISTS (SELECT 1 FROM lib_memberships ms WHERE ms.student_id = s.id AND ms.status = 'active'
                      AND ms.start_date <= CAST(:d AS date) AND ms.end_date >= CAST(:d AS date))
      ORDER BY sh.start_time ASC, h.name ASC, a.seat_no ASC`, repl);
  const summary = {
    expected: rows.length,
    present: rows.filter((r) => r.mark === "present").length,
    absent: rows.filter((r) => r.mark === "absent").length,
    inside: rows.filter((r) => r.mark === "present" && r.check_in_at && !r.check_out_at).length
  };
  return { date: d, off_reason: core.offReason(settings, d), items: rows, summary };
}

async function assertMarkable(venueId, studentId, date) {
  const today = U.todayIST();
  if (!U.isYmd(date)) throw new AppError("Date is invalid", 400);
  if (date > today) throw new AppError("You cannot mark attendance for a future date", 400);
  if (U.diffDays(date, today) > 60) throw new AppError("You can edit attendance for the last 60 days only", 400);
  return core.findStudent(venueId, studentId);
}

async function mark(ctx, b) {
  const date = core.blank(b.date) ? U.todayIST() : b.date;
  const student = await assertMarkable(ctx.venue.id, b.student_id, date);
  const status = b.status === "absent" ? "absent" : "present";
  const isToday = date === U.todayIST();
  const where = { venue_id: ctx.venue.id, student_id: student.id, att_date: date };
  const now = new Date();
  let row = await LibAttendance.findOne({ where });
  const data = status === "present"
    ? { status, check_in_at: row && row.check_in_at ? row.check_in_at : isToday ? now : null, source: row ? row.source : "manual", marked_by: markedBy(ctx.user) }
    : { status, check_in_at: null, check_out_at: null, source: "manual", marked_by: markedBy(ctx.user) };
  if (row) await row.update(data);
  else {
    try { row = await LibAttendance.create({ ...where, ...data, source: "manual" }); }
    catch (e) { if (e.name !== "SequelizeUniqueConstraintError") throw e; row = await LibAttendance.findOne({ where }); await row.update(data); }
  }
  return row;
}

// Marks every expected student who is not marked yet.
async function markAll(ctx, b) {
  const date = core.blank(b.date) ? U.todayIST() : b.date;
  if (!U.isYmd(date) || date > U.todayIST()) throw new AppError("Date is invalid", 400);
  const status = b.status === "absent" ? "absent" : "present";
  const out = await day(ctx.venue.id, ctx.settings, date, b.shift_id);
  if (out.off_reason) throw new AppError(`The library is closed on this day (${out.off_reason})`, 400);
  const todo = out.items.filter((r) => !r.mark);
  if (!todo.length) return { marked: 0 };
  const isToday = date === U.todayIST();
  await LibAttendance.bulkCreate(todo.map((r) => ({
    venue_id: ctx.venue.id, student_id: r.id, att_date: date, status,
    check_in_at: status === "present" && isToday ? new Date() : null, source: "manual", marked_by: markedBy(ctx.user)
  })), { ignoreDuplicates: true });
  return { marked: todo.length };
}

async function checkout(ctx, b) {
  const date = core.blank(b.date) ? U.todayIST() : b.date;
  const student = await assertMarkable(ctx.venue.id, b.student_id, date);
  const row = await LibAttendance.findOne({ where: { venue_id: ctx.venue.id, student_id: student.id, att_date: date, status: "present" } });
  if (!row) throw new AppError("Mark the student present first", 400);
  await row.update({ check_out_at: b.clear ? null : new Date() });
  return row;
}

async function studentMonth(venueId, studentId, month) {
  const s = await core.findStudent(venueId, studentId);
  const m = /^\d{4}-\d{2}$/.test(String(month || "")) ? month : U.todayIST().slice(0, 7);
  const rows = await run(
    `SELECT to_char(att_date, 'YYYY-MM-DD') AS date, status, check_in_at, check_out_at, source
       FROM lib_attendance WHERE student_id = :s AND to_char(att_date, 'YYYY-MM') = :m ORDER BY att_date ASC`,
    { s: s.id, m }
  );
  return { month: m, days: rows, present: rows.filter((r) => r.status === "present").length };
}

/* ===================== QR (static poster + rotating kiosk) ===================== */
function rotKey(settings, w) {
  return crypto.createHmac("sha256", `${env.jwt.secret}:${settings.qr_token}`).update(String(w)).digest("base64url").slice(0, 12);
}
const curWindow = () => Math.floor(Date.now() / WINDOW_MS);

function validRot(settings, k, w) {
  const win = Number(w);
  if (!k || !Number.isInteger(win)) return false;
  const cur = curWindow();
  if (win > cur || cur - win > 2) return false; // a scanned code stays valid for about 2-3 minutes
  const a = Buffer.from(String(k));
  const b = Buffer.from(rotKey(settings, win));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function staticQrPng(venueId) {
  const s = await insights.getSettings(venueId);
  return QRCode.toBuffer(insights.checkinUrl(s), { width: 900, margin: 2, errorCorrectionLevel: "M" });
}

// Data URL of the rotating code, shown on the kiosk screen.
async function kioskQrDataUrl(settings) {
  const w = curWindow();
  const url = `${insights.checkinUrl(settings)}?k=${rotKey(settings, w)}&w=${w}`;
  return QRCode.toDataURL(url, { width: 560, margin: 1, errorCorrectionLevel: "M" });
}

async function posterPdf(venue, settings, res) {
  if (settings.qr_mode === "rotating") throw new AppError("A printed poster cannot be used in rotating-QR mode. Open the kiosk screen instead.", 400);
  const url = insights.checkinUrl(settings);
  const [png, id] = await Promise.all([QRCode.toBuffer(url, { width: 900, margin: 1, errorCorrectionLevel: "M" }), gymIdentity(venue)]);
  const name = String((id && id.name) || venue.hall_name || "Library");
  const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: `Attendance QR - ${name}`, Author: name } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="library-attendance-qr.pdf"');
  doc.pipe(res);
  const W = doc.page.width;
  doc.rect(0, 0, W, 160).fill("#0b1b3a");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(name.length > 26 ? 26 : 34).text(name, 40, 62, { width: W - 80, height: 70, ellipsis: true, align: "center" });
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(30).text("SCAN TO MARK YOUR ATTENDANCE", 40, 190, { width: W - 80, align: "center" });
  doc.fillColor("#475569").font("Helvetica").fontSize(15).text("Hazri lagane ke liye scan karein", 40, 230, { width: W - 80, align: "center" });
  const size = 320;
  const qx = (W - size) / 2;
  doc.roundedRect(qx - 18, 273, size + 36, size + 36, 20).lineWidth(3).strokeColor("#0b1b3a").stroke();
  doc.image(png, qx, 291, { width: size, height: size });
  const steps = [["1", "Scan this QR code with your phone camera"], ["2", "Type your Student ID (example: S0012)"], ["3", "Tap MARK ATTENDANCE - done!"]];
  let y = 291 + size + 45;
  steps.forEach(([n, t]) => {
    doc.circle(90, y + 11, 15).fill("#16a34a");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text(n, 75, y + 5, { width: 30, align: "center" });
    doc.fillColor("#0f172a").font("Helvetica").fontSize(17).text(t, 125, y + 3, { width: W - 170 });
    y += 40;
  });
  doc.fillColor("#94a3b8").font("Helvetica").fontSize(9).text(url, 40, 805, { width: W - 80, align: "center" });
  doc.end();
}

/* ===================== public check-in ===================== */
async function findByToken(token) {
  if (!token || !/^[A-Za-z0-9_-]{10,60}$/.test(String(token))) return null;
  const settings = await LibSettings.findOne({ where: { qr_token: String(token) } });
  const venue = settings ? await Venue.findOne({ where: { id: settings.venue_id, is_active: true } }) : null;
  return settings && venue ? { settings, venue } : null;
}

async function findByKioskToken(token) {
  if (!token || !/^[A-Za-z0-9_-]{10,60}$/.test(String(token))) return null;
  const settings = await LibSettings.findOne({ where: { kiosk_token: String(token) } });
  const venue = settings ? await Venue.findOne({ where: { id: settings.venue_id, is_active: true } }) : null;
  return settings && venue ? { settings, venue } : null;
}

// "S0012", "s12", "12" => student code. 10-digit mobile => phone.
function normalizeId(raw) {
  const s = String(raw || "").replace(/[\s\-+]/g, "").toUpperCase();
  const digits = s.replace(/\D/g, "");
  if (/^\d+$/.test(s)) {
    if (digits.length === 10) return { phone: digits };
    if (digits.length === 12 && digits.startsWith("91")) return { phone: digits.slice(2) };
    if (digits.length === 11 && digits.startsWith("0")) return { phone: digits.slice(1) };
  }
  const m = s.match(/^S?(\d{1,6})$/);
  return m ? { code: `S${m[1].padStart(4, "0")}` } : null;
}

// code: not_found | disabled | closed | stale_qr | bad_id | no_student | frozen | left | expired | not_started | outside_shift | ok | out | already
async function checkIn(token, input, rot = {}) {
  const gate = await findByToken(token);
  if (!gate) return { code: "not_found" };
  const { settings, venue } = gate;
  const base = { venue, settings };
  if (!settings.qr_enabled) return { ...base, code: "disabled" };
  if (settings.qr_mode === "rotating" && !validRot(settings, rot.k, rot.w)) return { ...base, code: "stale_qr" };
  const today = U.todayIST();
  const off = core.offReason(settings, today);
  if (off) return { ...base, code: "closed", reason: off };

  const key = normalizeId(input && input.id);
  if (!key) return { ...base, code: "bad_id" };
  let student;
  if (key.phone) {
    const matches = await LibStudent.findAll({ where: { venue_id: venue.id, is_archived: false, phone: key.phone }, limit: 2 });
    // same mobile on more than one student: do not guess, ask for the Student ID
    if (matches.length > 1) return { ...base, code: "bad_id", shared_phone: true };
    student = matches[0] || null;
  } else {
    student = await LibStudent.findOne({ where: { venue_id: venue.id, is_archived: false, student_code: key.code } });
  }
  if (!student) return { ...base, code: "no_student" };
  if (settings.require_phone && !key.phone) {
    const last4 = String((input && input.last4) || "").replace(/\D/g, "");
    if (last4.length !== 4 || !String(student.phone).endsWith(last4)) return { ...base, code: "no_student" }; // same answer, reveals nothing
  }
  if (student.status === "left") return { ...base, code: "left", student };
  if (student.status === "frozen") return { ...base, code: "frozen", student };

  const { Op } = require("sequelize");
  const ms = await LibMembership.findOne({
    where: { student_id: student.id, status: "active", start_date: { [Op.lte]: today }, end_date: { [Op.gte]: today } },
    order: [["end_date", "DESC"]]
  });
  if (!ms) {
    const latest = await LibMembership.findOne({ where: { student_id: student.id, status: "active" }, order: [["end_date", "DESC"]] });
    if (latest && latest.start_date > today) return { ...base, code: "not_started", student, date: latest.start_date };
    return { ...base, code: "expired", student, date: latest ? latest.end_date : null };
  }

  const alloc = await LibAllocation.findOne({ where: { student_id: student.id, status: "active" } });
  const shift = alloc ? await LibShift.findByPk(alloc.shift_id) : null;
  const inShift = !shift || core.withinShift(core.nowMinIST(), shift, settings.grace_minutes);
  if (!inShift && settings.enforce_shift) return { ...base, code: "outside_shift", student, shift };

  const where = { venue_id: venue.id, student_id: student.id, att_date: today };
  const now = new Date();
  const ctxOut = { ...base, student, ms, shift, daysLeft: U.diffDays(today, ms.end_date) };
  let row = await LibAttendance.findOne({ where });

  if (!row || row.status !== "present") {
    if (row) await row.update({ status: "present", check_in_at: now, check_out_at: null, source: "qr", marked_by: null, note: inShift ? null : "Outside shift" });
    else {
      try { row = await LibAttendance.create({ ...where, status: "present", check_in_at: now, source: "qr", note: inShift ? null : "Outside shift" }); }
      catch (e) { if (e.name !== "SequelizeUniqueConstraintError") throw e; return { ...ctxOut, code: "already", at: now }; }
    }
    return { ...ctxOut, code: "ok", at: now, outsideShift: !inShift };
  }
  // A second scan at least 10 minutes later is a check-out.
  if (!row.check_out_at && row.check_in_at && now - new Date(row.check_in_at) >= 10 * 60 * 1000) {
    await row.update({ check_out_at: now });
    return { ...ctxOut, code: "out", at: now, inAt: row.check_in_at };
  }
  return { ...ctxOut, code: "already", at: row.check_out_at || row.check_in_at };
}

module.exports = {
  day, mark, markAll, checkout, studentMonth, staticQrPng, kioskQrDataUrl, posterPdf, findByToken, findByKioskToken, checkIn
};