const PDFDocument = require("pdfkit");
const { GymPayment, GymMember, GymMembership } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const { T, gymIdentity, caps, line1, pill } = require("./gym.brand");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Streams a downloadable receipt PDF. The vendor saves it and shares it however they like.
async function receiptPdf({ venue }, paymentId, res) {
  const pay = UUID_RE.test(String(paymentId))
    ? await GymPayment.findOne({ where: { id: paymentId, venue_id: venue.id, status: "paid" } })
    : null;
  if (!pay) throw new AppError("Receipt not found", 404);
  const [member, ms, id] = await Promise.all([
    GymMember.findByPk(pay.member_id),
    pay.membership_id ? GymMembership.findByPk(pay.membership_id) : null,
    gymIdentity(venue)
  ]);

  const doc = new PDFDocument({ size: "A5", margin: 0, info: { Title: `Receipt ${pay.receipt_no || ""}`.trim(), Author: id.name } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${String(pay.receipt_no || "receipt").replace(/[^\w-]+/g, "_")}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;
  const H = doc.page.height;
  const P = 28;
  const CW = W - P * 2;

  /* ---------- header band: gym name + owner ---------- */
  doc.rect(0, 0, W, 88).fill(T.ink);
  doc.rect(0, 0, W, 5).fill(T.accent);
  line1(doc, id.name, P, 22, { font: "Helvetica-Bold", size: 19, color: "#ffffff", width: CW });
  caps(doc, "Payment receipt", P, 49, { color: "#fca5a5", size: 8, width: 200 });
  if (id.owner) line1(doc, `Owner: ${id.owner}`, P, 64, { size: 9, color: T.faint, width: CW });

  /* ---------- contact strip: phone, email, address ---------- */
  doc.font("Helvetica").fontSize(8.5);
  const addrH = id.address ? doc.heightOfString(id.address, { width: CW }) : 0;
  const hasRow1 = id.phone || id.email;
  const stripH = 12 + (hasRow1 ? 26 : 0) + (id.address ? 11 + addrH + 6 : 0) + (id.gstin ? 24 : 0) + 4;
  doc.rect(0, 88, W, stripH).fill(T.soft);
  doc.moveTo(0, 88 + stripH).lineTo(W, 88 + stripH).lineWidth(0.6).strokeColor(T.line).stroke();
  let y = 88 + 12;
  if (hasRow1) {
    if (id.phone) { caps(doc, "Phone", P, y, { width: 120 }); line1(doc, id.phone, P, y + 9, { font: "Helvetica-Bold", size: 9, width: 120 }); }
    if (id.email) { caps(doc, "Email (login)", P + 140, y, { width: 220 }); line1(doc, id.email, P + 140, y + 9, { font: "Helvetica-Bold", size: 9, width: CW - 140 }); }
    y += 26;
  }
  if (id.address) {
    caps(doc, "Address", P, y, { width: 120 });
    doc.font("Helvetica").fontSize(8.5).fillColor(T.body).text(id.address, P, y + 9, { width: CW });
    y += 11 + addrH + 6;
  }
  if (id.gstin) { caps(doc, "GSTIN", P, y, { width: 120 }); line1(doc, id.gstin, P, y + 9, { font: "Helvetica-Bold", size: 9, width: CW }); }
  y = 88 + stripH + 18;

  /* ---------- receipt no, date, PAID ---------- */
  caps(doc, "Receipt no.", P, y, { width: 130 });
  line1(doc, pay.receipt_no || "-", P, y + 10, { font: "Helvetica-Bold", size: 12, width: 150 });
  caps(doc, "Date", P + 170, y, { width: 100 });
  line1(doc, pay.paid_on ? U.fmtDate(pay.paid_on) : "-", P + 170, y + 10, { font: "Helvetica-Bold", size: 12, width: 110 });
  doc.font("Helvetica-Bold").fontSize(9);
  const paidW = doc.widthOfString("PAID") + 24;
  pill(doc, "PAID", W - P - paidW, y + 3, { bg: T.greenSoft, fg: T.green, border: T.greenSoft, size: 9, h: 22, padX: 12 });
  y += 38;
  doc.moveTo(P, y).lineTo(W - P, y).lineWidth(0.6).strokeColor(T.line).stroke();
  y += 14;

  /* ---------- received from ---------- */
  caps(doc, "Received from", P, y, { width: 200 });
  line1(doc, member ? member.name : "-", P, y + 11, { font: "Helvetica-Bold", size: 14, color: T.text, width: CW });
  if (member) line1(doc, `${member.member_code}   |   +91 ${member.phone}`, P, y + 30, { size: 9, color: T.muted, width: CW });
  y += 54;

  /* ---------- details table ---------- */
  const rows = [
    ["Plan", ms ? ms.plan_name : "-"],
    ["Period", ms ? `${U.fmtDate(ms.start_date)}  to  ${U.fmtDate(ms.end_date)}` : "-"],
    ["Payment mode", titleCase(pay.mode)]
  ];
  if (pay.reference) rows.push(["Reference", pay.reference]);
  rows.forEach(([k, v], i) => {
    if (i % 2 === 0) doc.rect(P, y, CW, 24).fill(T.soft);
    line1(doc, k, P + 10, y + 8, { size: 8.5, color: T.muted, width: 100 });
    line1(doc, v, P + 120, y + 7.5, { font: "Helvetica-Bold", size: 9.5, color: T.text, width: CW - 130 });
    y += 24;
  });
  y += 16;

  /* ---------- amount box ---------- */
  doc.save().roundedRect(P, y, CW, 70, 10).fill(T.ink).restore();
  doc.rect(P, y + 14, 4, 42).fill(T.accent);
  caps(doc, "Amount received", P + 18, y + 14, { color: T.faint, size: 7.5, width: 200 });
  line1(doc, `Rs. ${U.inr(pay.amount)}`, P + 18, y + 28, { font: "Helvetica-Bold", size: 26, color: "#ffffff", width: 230 });
  if (ms) {
    const bal = U.money(Number(ms.total_amount) - Number(ms.amount_paid));
    const text = bal > 0 ? `Balance due: Rs. ${U.inr(bal)}` : "Fully paid";
    doc.font("Helvetica-Bold").fontSize(8.5);
    const w = doc.widthOfString(text) + 24;
    pill(doc, text, W - P - 14 - w, y + 26, bal > 0
      ? { bg: T.accentSoft, fg: T.accent, border: T.accentSoft, size: 8.5, h: 22, padX: 12 }
      : { bg: T.greenSoft, fg: T.green, border: T.greenSoft, size: 8.5, h: 22, padX: 12 });
  }
  y += 70 + 10;

  const rate = ms ? Number(ms.tax_rate) : 0;
  if (rate > 0) {
    const amt = Number(pay.amount);
    const tax = U.money((amt * rate) / (100 + rate)); // prices are GST-inclusive
    line1(doc, `Includes GST @ ${rate}%: Rs. ${U.inr(tax)}   (taxable value Rs. ${U.inr(amt - tax)})`, P, y, { size: 8, color: T.muted, width: CW });
  }

  /* ---------- footer ---------- */
  const fy = H - 66;
  doc.moveTo(P, fy).lineTo(W - P, fy).lineWidth(0.6).strokeColor(T.line).stroke();
  line1(doc, `Thank you for training with ${id.name}!`, P, fy + 10, { font: "Helvetica-Bold", size: 9, color: T.text, width: CW });
  line1(doc, `Received by ${pay.received_by || "-"}   |   This is a computer generated receipt, no signature needed.`, P, fy + 24, { size: 7.5, color: T.muted, width: CW });
  const contact = [id.phone, id.email].filter(Boolean).join("   |   ");
  if (contact) line1(doc, contact, P, fy + 36, { size: 7.5, color: T.faint, width: CW });
  doc.rect(0, H - 5, W, 5).fill(T.accent);
  doc.end();
}

module.exports = { receiptPdf };