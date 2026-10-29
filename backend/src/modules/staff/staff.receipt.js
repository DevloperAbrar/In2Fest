const PDFDocument = require("pdfkit");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const { gymIdentity, pill } = require("../gym/gym.brand");
const { PAL: C, put, putFit, para, paraH, hline, drawWave, navyBar } = require("../billing/pdf.theme");
const { GymStaff, GymStaffPayment } = require("./staff.models");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const monthLabel = (m) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const rs = (n) => `Rs. ${U.inr(n)}`;

// Salary receipt + pay slip. Figures come from the snapshot saved with the payment,
// so an old receipt never changes when attendance is edited later.
async function salaryReceiptPdf({ venue }, paymentId, res) {
  const pay = UUID_RE.test(String(paymentId)) ? await GymStaffPayment.findOne({ where: { id: paymentId, venue_id: venue.id } }) : null;
  if (!pay) throw new AppError("Receipt not found", 404);
  const [staff, id] = await Promise.all([GymStaff.findByPk(pay.staff_id), gymIdentity(venue)]);
  const snap = pay.snapshot || {};
  const k = snap.calc || {};
  const cancelled = pay.status === "cancelled";

  const doc = new PDFDocument({ size: "A5", margin: 0, info: { Title: `Salary receipt ${pay.receipt_no || ""}`.trim(), Author: id.name } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${String(pay.receipt_no || "salary-receipt").replace(/[^\w-]+/g, "_")}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;
  const H = doc.page.height;
  const P = 28;
  const CW = W - P * 2;

  const HEAD_H = 98;
  drawWave(doc, HEAD_H);
  let titleX = P;
  if (id.logo) {
    try {
      doc.save().roundedRect(P, 18, 50, 50, 9).fill("#ffffff").restore();
      doc.image(id.logo, P + 4, 22, { fit: [42, 42], align: "center", valign: "center" });
      titleX = P + 62;
    } catch { titleX = P; }
  }
  put(doc, "SALARY RECEIPT", titleX, 24, { font: "Helvetica-Bold", size: 20, color: C.white, spacing: 0.5 });
  putFit(doc, id.name, titleX, 54, 190, { size: 10, minSize: 7, color: "#c7d8f7" });
  putFit(doc, `NO: ${pay.receipt_no || "-"}`, W - P - 150, 28, 150, { font: "Helvetica-Bold", size: 11, minSize: 7, color: C.white, align: "right" });

  let y = HEAD_H + 16;

  const colW = (CW - 16) / 2;
  const rightX = W - P - colW;
  put(doc, "Paid To:", P, y, { font: "Helvetica-Bold", size: 12, color: C.ink });
  let ly = y + 19;
  ly += para(doc, staff ? staff.name : "-", P, ly, colW, { font: "Helvetica-Bold", size: 10.5, color: C.ink, lineGap: 1 }) + 3;
  [staff && staff.designation, staff && staff.phone && `+91 ${staff.phone}`, staff && `Staff ID: ${staff.staff_code}`].filter(Boolean).forEach((l) => {
    ly += para(doc, l, P, ly, colW, { size: 9, color: C.text, lineGap: 1 }) + 2;
  });
  put(doc, "From:", rightX, y, { font: "Helvetica-Bold", size: 12, color: C.ink, width: colW, align: "right" });
  let ry = y + 19;
  ry += para(doc, id.name, rightX, ry, colW, { font: "Helvetica-Bold", size: 10.5, color: C.ink, align: "right", lineGap: 1 }) + 3;
  [id.owner, id.phone, id.address].filter(Boolean).forEach((l) => {
    ry += para(doc, l, rightX, ry, colW, { size: 9, color: C.text, align: "right", lineGap: 1 }) + 2;
  });
  y = Math.max(ly, ry) + 8;

  put(doc, "Date:", P, y + 3, { font: "Helvetica-Bold", size: 10, color: C.ink });
  put(doc, pay.paid_on ? U.fmtDate(pay.paid_on) : "-", P + 32, y + 3, { size: 10, color: C.text });
  put(doc, `For: ${monthLabel(pay.month)}`, P + 130, y + 3, { font: "Helvetica-Bold", size: 10, color: C.ink });
  if (cancelled) pill(doc, "CANCELLED", W - P - 84, y, { bg: C.redSoft, fg: C.red, border: C.redSoft, size: 9, h: 22, padX: 14 });
  else pill(doc, "PAID", W - P - 58, y, { bg: C.greenSoft, fg: C.green, border: C.greenSoft, size: 9, h: 22, padX: 16 });
  y += 34;

  const wAmt = 100;
  const wDesc = CW - wAmt;
  const TH = 24;
  doc.rect(P, y, CW, TH).fill(C.navy);
  put(doc, "Salary details", P + 10, y + 8, { font: "Helvetica-Bold", size: 9, color: C.white });
  put(doc, "Amount", P + wDesc, y + 8, { font: "Helvetica-Bold", size: 9, color: C.white, width: wAmt - 10, align: "right" });
  const top = y;
  y += TH;

  const D = k.days_in_month || 30;
  const items = [["Monthly salary", rs(k.monthly_salary || 0), false]];
  if (k.eligible_days && k.eligible_days < D) items.push([`Pro-rated for ${k.eligible_days} of ${D} days`, rs(k.base_amount || 0), false]);
  if (k.attendance_deduction > 0) {
    const d = k.chargeable_units;
    items.push([`Absence deduction (${d} day${d === 1 ? "" : "s"} x ${rs(k.deduction_per_day)})`, `- ${rs(k.attendance_deduction)}`, false]);
  }
  if (k.bonus > 0) items.push(["Bonus / incentive", `+ ${rs(k.bonus)}`, false]);
  if (k.other_deduction > 0) items.push([k.adjustment_note ? `Advance / other: ${k.adjustment_note}` : "Advance / other deduction", `- ${rs(k.other_deduction)}`, false]);
  items.push(["Net salary for the month", rs(k.net_amount || 0), true]);
  items.forEach(([label, val, strong], i) => {
    const font = strong ? "Helvetica-Bold" : "Helvetica";
    const h = Math.max(paraH(doc, label, wDesc - 20, font, 9, 0) + 12, 22);
    if (strong) doc.rect(P, y, CW, h).fill(C.soft);
    para(doc, label, P + 10, y + 6, wDesc - 20, { font, size: 9, color: strong ? C.ink : C.text, lineGap: 0 });
    put(doc, val, P + wDesc, y + 6, { font, size: 9, color: strong ? C.ink : C.text, width: wAmt - 10, align: "right" });
    y += h;
    if (i < items.length - 1) hline(doc, P, W - P, y, C.line, 0.5);
  });
  doc.rect(P, top, CW, y - top).lineWidth(0.8).strokeColor(C.grid).stroke();
  y += 10;

  const c = k.counts || {};
  const att = `Attendance: Present ${c.present || 0}  |  Leave ${c.absent || 0}  |  Half day ${c.half_day || 0}  |  Paid leave ${c.paid_leave || 0}  |  Week off ${c.week_off || 0}`;
  putFit(doc, att, P, y, CW, { size: 7.5, minSize: 5.5, color: C.muted });
  y += 20;

  const barW = 215;
  const barX = W - P - barW;
  navyBar(doc, barX, y, barW, 32, cancelled ? "Amount (cancelled)" : "Amount Paid", rs(pay.amount), { size: 10.5 });
  let ty = y + 32 + 8;
  if (!cancelled) {
    const before = Number(snap.paid_before) || 0;
    if (before > 0) {
      put(doc, "Paid earlier this month", barX + 14, ty, { size: 9, color: C.muted });
      put(doc, rs(before), barX + 100, ty, { size: 9, color: C.muted, width: barW - 114, align: "right" });
      ty += 16;
    }
    const bal = Number(snap.balance_after) || 0;
    doc.rect(barX, ty, barW, 26).lineWidth(1.1).fillAndStroke(bal > 0 ? C.redSoft : C.greenSoft, bal > 0 ? C.red : C.green);
    put(doc, bal > 0 ? "Balance Due" : "Fully Paid", barX + 14, ty + 8.5, { font: "Helvetica-Bold", size: 10, color: bal > 0 ? C.red : C.green });
    if (bal > 0) put(doc, rs(bal), barX + 100, ty + 8.5, { font: "Helvetica-Bold", size: 10, color: C.red, width: barW - 114, align: "right" });
    ty += 26;
  } else if (pay.cancel_reason) {
    para(doc, `Cancelled: ${pay.cancel_reason}`, barX, ty, barW, { size: 8.5, color: C.red, lineGap: 1 });
  }

  put(doc, "Payment Information:", P, y, { font: "Helvetica-Bold", size: 11, color: C.ink });
  let py = y + 20;
  [["Mode", titleCase(pay.mode)], pay.reference && ["Reference", pay.reference], ["Paid by", pay.paid_by || "-"]].filter(Boolean).forEach(([a, b]) => {
    put(doc, `${a}:`, P, py, { font: "Helvetica-Bold", size: 9, color: C.ink });
    putFit(doc, b, P + 56, py, barX - P - 56 - 10, { size: 9, minSize: 6.5, color: C.text });
    py += 16;
  });

  const fy = H - 46;
  hline(doc, P, W - P, fy, C.line, 0.75);
  putFit(doc, "This is a computer generated receipt, no signature needed.", P, fy + 10, CW, { size: 7.5, minSize: 5.5, color: C.muted, align: "center" });
  const contact = [id.phone, id.email].filter(Boolean).join("   |   ");
  if (contact) putFit(doc, contact, P, fy + 22, CW, { size: 7.5, minSize: 5.5, color: C.muted, align: "center" });
  doc.end();
}

module.exports = { salaryReceiptPdf };