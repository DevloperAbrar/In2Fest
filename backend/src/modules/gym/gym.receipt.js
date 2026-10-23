const PDFDocument = require("pdfkit");
const { GymPayment, GymMember, GymMembership } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const { T, gymIdentity, caps, line1, fitLine, pill } = require("./gym.brand");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const modeLabel = (s) => (/^(upi|neft|rtgs|imps)$/i.test(String(s || "")) ? String(s).toUpperCase() : titleCase(s));

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

  /* ---------- faint logo watermark behind everything ---------- */
  let logoOk = false;
  if (id.logo) {
    try {
      doc.save();
      doc.opacity(0.05);
      doc.image(id.logo, (W - 230) / 2, 238, { fit: [230, 230], align: "center", valign: "center" });
      doc.restore();
      logoOk = true;
    } catch {
      doc.restore();
      logoOk = false;
    }
  }

  /* ---------- header band: logo + gym name ---------- */
  doc.rect(0, 0, W, 90).fill(T.ink);
  doc.rect(0, 0, W, 5).fill(T.accent);
  let textX = P;
  if (logoOk) {
    doc.save().roundedRect(P, 19, 54, 54, 10).fill("#ffffff").restore();
    try { doc.image(id.logo, P + 5, 24, { fit: [44, 44], align: "center", valign: "center" }); } catch { /* logo is optional */ }
    textX = P + 54 + 14;
  }
  fitLine(doc, id.name, textX, 28, { font: "Helvetica-Bold", size: 19, minSize: 11, color: "#ffffff", width: W - textX - P });
  caps(doc, "Payment receipt", textX, 56, { color: "#fca5a5", size: 8, width: 200 });

  /* ---------- contact strip: owner, phone, GSTIN, email, address ---------- */
  doc.font("Helvetica").fontSize(8.5);
  const addrH = id.address ? doc.heightOfString(id.address, { width: CW }) : 0;
  const row1 = [
    id.owner && ["Owner", id.owner],
    id.phone && ["Phone", id.phone],
    id.gstin && ["GSTIN", id.gstin]
  ].filter(Boolean);
  const stripH = 12 + (row1.length ? 26 : 0) + (id.email ? 26 : 0) + (id.address ? 11 + addrH + 6 : 0) + 4;
  doc.rect(0, 90, W, stripH).fill(T.soft);
  doc.moveTo(0, 90 + stripH).lineTo(W, 90 + stripH).lineWidth(0.6).strokeColor(T.line).stroke();
  let y = 90 + 12;
  if (row1.length) {
    const gap = 12;
    const cw = (CW - gap * (row1.length - 1)) / row1.length;
    row1.forEach(([k, v], i) => {
      const x = P + i * (cw + gap);
      caps(doc, k, x, y, { width: cw });
      fitLine(doc, v, x, y + 9, { font: "Helvetica-Bold", size: 9, minSize: 6.5, width: cw });
    });
    y += 26;
  }
  if (id.email) {
    caps(doc, "Email", P, y, { width: 120 });
    fitLine(doc, id.email, P, y + 9, { font: "Helvetica-Bold", size: 9, minSize: 6, width: CW });
    y += 26;
  }
  if (id.address) {
    caps(doc, "Address", P, y, { width: 120 });
    doc.font("Helvetica").fontSize(8.5).fillColor(T.body).text(id.address, P, y + 9, { width: CW });
    y += 11 + addrH + 6;
  }
  y = 90 + stripH + 18;

  /* ---------- receipt no, date, PAID ---------- */
  caps(doc, "Receipt no.", P, y, { width: 130 });
  fitLine(doc, pay.receipt_no || "-", P, y + 10, { font: "Helvetica-Bold", size: 12, minSize: 8, width: 150 });
  caps(doc, "Date", P + 170, y, { width: 100 });
  fitLine(doc, pay.paid_on ? U.fmtDate(pay.paid_on) : "-", P + 170, y + 10, { font: "Helvetica-Bold", size: 12, minSize: 8, width: 110 });
  doc.font("Helvetica-Bold").fontSize(9);
  const paidW = doc.widthOfString("PAID") + 24;
  pill(doc, "PAID", W - P - paidW, y + 3, { bg: T.greenSoft, fg: T.green, border: T.greenSoft, size: 9, h: 22, padX: 12 });
  y += 38;
  doc.moveTo(P, y).lineTo(W - P, y).lineWidth(0.6).strokeColor(T.line).stroke();
  y += 14;

  /* ---------- received from ---------- */
  caps(doc, "Received from", P, y, { width: 200 });
  fitLine(doc, member ? member.name : "-", P, y + 11, { font: "Helvetica-Bold", size: 14, minSize: 9, color: T.text, width: CW });
  if (member) line1(doc, `${member.member_code}   |   +91 ${member.phone}`, P, y + 30, { size: 9, color: T.muted, width: CW });
  y += 54;

  /* ---------- details table ---------- */
  const rows = [
    ["Plan", ms ? ms.plan_name : "-"],
    ["Period", ms ? `${U.fmtDate(ms.start_date)}  to  ${U.fmtDate(ms.end_date)}` : "-"],
    ["Payment mode", modeLabel(pay.mode)]
  ];
  if (pay.reference) rows.push(["Reference", pay.reference]);
  rows.forEach(([k, v], i) => {
    if (i % 2 === 0) doc.rect(P, y, CW, 24).fill(T.soft);
    line1(doc, k, P + 10, y + 8, { size: 8.5, color: T.muted, width: 100 });
    fitLine(doc, v, P + 120, y + 7.5, { font: "Helvetica-Bold", size: 9.5, minSize: 6.5, color: T.text, width: CW - 130 });
    y += 24;
  });
  y += 16;

  /* ---------- amount box ---------- */
  doc.save().roundedRect(P, y, CW, 70, 10).fill(T.ink).restore();
  doc.rect(P, y + 14, 4, 42).fill(T.accent);
  caps(doc, "Amount received", P + 18, y + 14, { color: T.faint, size: 7.5, width: 200 });
  fitLine(doc, `Rs. ${U.inr(pay.amount)}`, P + 18, y + 28, { font: "Helvetica-Bold", size: 26, minSize: 14, color: "#ffffff", width: 190 });
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
    fitLine(doc, `Includes GST @ ${rate}%: Rs. ${U.inr(tax)}   (taxable value Rs. ${U.inr(amt - tax)})`, P, y, { size: 8, minSize: 6, color: T.muted, width: CW });
  }

  /* ---------- footer ---------- */
  const fy = H - 66;
  doc.moveTo(P, fy).lineTo(W - P, fy).lineWidth(0.6).strokeColor(T.line).stroke();
  fitLine(doc, `Thank you for training with ${id.name}!`, P, fy + 10, { font: "Helvetica-Bold", size: 9, minSize: 6.5, color: T.text, width: CW });
  fitLine(doc, `Received by ${pay.received_by || "-"}   |   This is a computer generated receipt, no signature needed.`, P, fy + 24, { size: 7.5, minSize: 5.5, color: T.muted, width: CW });
  const contact = [id.phone, id.email].filter(Boolean).join("   |   ");
  if (contact) fitLine(doc, contact, P, fy + 36, { size: 7.5, minSize: 5.5, color: T.faint, width: CW });
  doc.rect(0, H - 5, W, 5).fill(T.accent);
  doc.end();
}

module.exports = { receiptPdf };