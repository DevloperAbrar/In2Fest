const PDFDocument = require("pdfkit");
const { QueryTypes, Op } = require("sequelize");
const { sequelize } = require("../../config/database");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const { gymIdentity } = require("../gym/gym.brand");
const C = require("./library.constants");
const core = require("./library.core");
const { LibPayment, LibMembership, LibStudent } = require("./library.models");

const collector = (user) => String((user && (user.name || user.email)) || "Owner").slice(0, 80);

// Creates the payment row inside an existing transaction (used by enrol, renew and "record payment").
async function recordTx(tx, ctx, { student, membership, amount, mode, paid_on, reference, note, kind = "fee" }) {
  const today = U.todayIST();
  const amt = U.money(U.num(amount, "Amount", { min: 0.01, max: 10000000 }));
  const payMode = C.PAYMENT_MODES.includes(mode) ? mode : "cash";
  const paidOn = core.blank(paid_on) ? today : core.checkDate(paid_on, "Payment date");
  if (paidOn > today) throw new AppError("Payment date cannot be in the future", 400);
  if (membership) {
    const balance = U.money(Number(membership.total_amount) - Number(membership.amount_paid));
    if (amt > balance + 0.009) throw new AppError(`Amount is more than the balance due (₹${U.inr(balance)})`, 400);
  }
  const seq = await core.nextSeq(tx, ctx.venue.id, "lib_payments", "receipt_seq");
  const prefix = (ctx.settings && ctx.settings.receipt_prefix) || "LR";
  return LibPayment.create({
    venue_id: ctx.venue.id, student_id: student.id, membership_id: membership ? membership.id : null, kind,
    amount: amt, mode: payMode, paid_on: paidOn, receipt_seq: seq, receipt_no: `${prefix}${String(seq).padStart(5, "0")}`,
    reference: core.clean(reference, 80), note: core.clean(note, 200), collected_by: collector(ctx.user), status: "paid"
  }, { transaction: tx });
}

// POST /students/:id/payments  -  collects money against the oldest membership that still has a balance.
async function record(ctx, studentId, b) {
  return LibPayment.sequelize.transaction(async (tx) => {
    await core.lock(tx, `libstu:${studentId}`);
    const student = await core.findStudent(ctx.venue.id, studentId, tx);
    let membership;
    if (b.membership_id) {
      membership = core.isUuid(b.membership_id)
        ? await LibMembership.findOne({ where: { id: b.membership_id, student_id: student.id, status: "active" }, transaction: tx })
        : null;
      if (!membership) throw new AppError("Membership not found", 404);
    } else {
      const open = await LibMembership.findAll({ where: { student_id: student.id, status: "active" }, order: [["start_date", "ASC"]], transaction: tx });
      membership = open.find((m) => Number(m.total_amount) - Number(m.amount_paid) > 0.009) || null;
      if (!membership) throw new AppError("There is no balance due for this student", 400);
    }
    const payment = await recordTx(tx, ctx, { student, membership, ...b });
    await core.recompute(tx, student.id);
    await student.reload({ transaction: tx });
    return { payment, student: core.present(student) };
  });
}

async function voidPayment(ctx, paymentId, reason) {
  return LibPayment.sequelize.transaction(async (tx) => {
    const pay = core.isUuid(paymentId)
      ? await LibPayment.findOne({ where: { id: paymentId, venue_id: ctx.venue.id }, transaction: tx })
      : null;
    if (!pay) throw new AppError("Payment not found", 404);
    if (pay.status === "void") throw new AppError("This payment is already cancelled", 400);
    await core.lock(tx, `libstu:${pay.student_id}`);
    await pay.update({ status: "void", voided_at: new Date(), void_reason: core.clean(reason, 200) || "Cancelled" }, { transaction: tx });
    await core.recompute(tx, pay.student_id);
    return pay;
  });
}

// Ledger with filters + totals.
async function ledger(venueId, q = {}) {
  const today = U.todayIST();
  const from = U.isYmd(q.from) ? q.from : `${today.slice(0, 8)}01`;
  const to = U.isYmd(q.to) ? q.to : today;
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 25, 1), 100);
  const repl = { v: venueId, from, to, limit, offset: (page - 1) * limit };
  let where = `p.venue_id = :v AND p.paid_on BETWEEN CAST(:from AS date) AND CAST(:to AS date)`;
  if (C.PAYMENT_MODES.includes(q.mode)) { where += ` AND p.mode = :mode`; repl.mode = q.mode; }
  if (q.status === "void") where += ` AND p.status = 'void'`; else where += ` AND p.status = 'paid'`;
  if (!core.blank(q.q)) { where += ` AND (s.name ILIKE :like OR p.receipt_no ILIKE :like OR s.phone ILIKE :like)`; repl.like = `%${U.likeEscape(q.q)}%`; }

  const [items, [count], byMode] = await Promise.all([
    sequelize.query(
      `SELECT p.id, p.amount::float AS amount, p.mode, p.paid_on, p.receipt_no, p.reference, p.status, p.kind, p.collected_by,
              s.id AS student_id, s.name AS student_name, s.student_code
         FROM lib_payments p JOIN lib_students s ON s.id = p.student_id
        WHERE ${where} ORDER BY p.paid_on DESC, p.receipt_seq DESC LIMIT :limit OFFSET :offset`,
      { replacements: repl, type: QueryTypes.SELECT }),
    sequelize.query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(p.amount), 0)::float AS total FROM lib_payments p JOIN lib_students s ON s.id = p.student_id WHERE ${where}`,
      { replacements: repl, type: QueryTypes.SELECT }),
    sequelize.query(`SELECT p.mode, SUM(p.amount)::float AS total FROM lib_payments p JOIN lib_students s ON s.id = p.student_id WHERE ${where} GROUP BY p.mode`,
      { replacements: repl, type: QueryTypes.SELECT })
  ]);
  return { items, total: count.n, total_amount: count.total, by_mode: byMode, page, limit, from, to };
}

const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

async function receiptPdf(ctx, paymentId, res) {
  const pay = core.isUuid(paymentId)
    ? await LibPayment.findOne({ where: { id: paymentId, venue_id: ctx.venue.id, status: "paid" } })
    : null;
  if (!pay) throw new AppError("Receipt not found", 404);
  const [student, ms, id] = await Promise.all([
    LibStudent.findByPk(pay.student_id),
    pay.membership_id ? LibMembership.findByPk(pay.membership_id) : null,
    gymIdentity(ctx.venue)
  ]);
  const name = String((id && id.name) || ctx.venue.hall_name || "Library");

  const doc = new PDFDocument({ size: "A5", margin: 0, info: { Title: `Receipt ${pay.receipt_no}`, Author: name } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${String(pay.receipt_no).replace(/[^\w-]+/g, "_")}.pdf"`);
  doc.pipe(res);
  const W = doc.page.width;
  const P = 28;

  doc.rect(0, 0, W, 86).fill("#0b1b3a");
  let tx = P;
  if (id && id.logo) {
    try { doc.save().roundedRect(P, 18, 50, 50, 9).fill("#ffffff").restore(); doc.image(id.logo, P + 4, 22, { fit: [42, 42], align: "center", valign: "center" }); tx = P + 62; } catch (e) { tx = P; }
  }
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text(name, tx, 22, { width: W - tx - P, ellipsis: true });
  doc.font("Helvetica").fontSize(10).fillColor("#cbd5e1").text("PAYMENT RECEIPT", tx, 46);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff").text(pay.receipt_no, tx, 62);

  let y = 108;
  const row = (label, value, bold) => {
    doc.font("Helvetica").fontSize(10).fillColor("#64748b").text(label, P, y, { width: 110 });
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 13 : 11).fillColor("#0f172a").text(String(value), P + 120, y - (bold ? 1 : 0), { width: W - P * 2 - 120 });
    y += bold ? 26 : 22;
  };
  row("Student", `${student.name} (${student.student_code})`);
  row("Phone", student.phone);
  if (ms) {
    row("Shift", `${ms.shift_name || "-"}`);
    row("Hall / Seat", `${ms.hall_name || "-"} / ${ms.seat_no || "-"}`);
    row("Period", `${U.fmtDate(ms.start_date)} to ${U.fmtDate(ms.end_date)}`);
  }
  row("Paid on", U.fmtDate(pay.paid_on));
  row("Mode", titleCase(pay.mode) + (pay.reference ? ` (${pay.reference})` : ""));
  y += 6;
  doc.moveTo(P, y).lineTo(W - P, y).strokeColor("#e2e8f0").stroke();
  y += 12;
  row("Amount paid", `Rs. ${U.inr(pay.amount)}`, true);
  if (ms) {
    row("Total fee", `Rs. ${U.inr(ms.total_amount)}`);
    row("Balance", `Rs. ${U.inr(Math.max(Number(ms.total_amount) - Number(ms.amount_paid), 0))}`);
  }
  doc.font("Helvetica").fontSize(9).fillColor("#94a3b8").text(`Collected by ${pay.collected_by || "-"}  |  Thank you!`, P, doc.page.height - 36, { width: W - P * 2, align: "center" });
  doc.end();
}

module.exports = { recordTx, record, voidPayment, ledger, receiptPdf, Op };