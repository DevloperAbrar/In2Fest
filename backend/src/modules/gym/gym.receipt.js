const PDFDocument = require("pdfkit");
const { GymPayment, GymMember, GymMembership } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const { gymIdentity, pill } = require("./gym.brand");
const { PAL: C, put, putFit, para, paraH, hline, vline, drawWave, navyBar } = require("../billing/pdf.theme");

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

  /* ---------- wave header: logo + RECEIPT + number ---------- */
  const HEAD_H = 98;
  drawWave(doc, HEAD_H);
  let titleX = P;
  if (id.logo) {
    try {
      doc.save().roundedRect(P, 18, 50, 50, 9).fill("#ffffff").restore();
      doc.image(id.logo, P + 4, 22, { fit: [42, 42], align: "center", valign: "center" });
      titleX = P + 50 + 12;
    } catch {
      titleX = P;
    }
  }
  put(doc, "RECEIPT", titleX, 22, { font: "Helvetica-Bold", size: 26, color: C.white, spacing: 1 });
  putFit(doc, id.name, titleX, 54, 190, { font: "Helvetica", size: 10, minSize: 7, color: "#c7d8f7" });
  putFit(doc, `NO: ${pay.receipt_no || "-"}`, W - P - 150, 26, 150, { font: "Helvetica-Bold", size: 11, minSize: 7, color: C.white, align: "right" });

  let y = HEAD_H + 16;

  /* ---------- Received from (left)  |  From (right) ---------- */
  const colW = (CW - 16) / 2;
  const rightX = W - P - colW;

  put(doc, "Received From:", P, y, { font: "Helvetica-Bold", size: 12, color: C.ink });
  let ly = y + 19;
  ly += para(doc, member ? member.name : "-", P, ly, colW, { font: "Helvetica-Bold", size: 10.5, color: C.ink, lineGap: 1 }) + 3;
  if (member && member.phone) ly += para(doc, `+91 ${member.phone}`, P, ly, colW, { size: 9, color: C.text, lineGap: 1 }) + 2;
  if (member && member.member_code) ly += para(doc, `Member ID: ${member.member_code}`, P, ly, colW, { size: 9, color: C.text, lineGap: 1 }) + 2;

  put(doc, "From:", rightX, y, { font: "Helvetica-Bold", size: 12, color: C.ink, width: colW, align: "right" });
  let ry = y + 19;
  ry += para(doc, id.name, rightX, ry, colW, { font: "Helvetica-Bold", size: 10.5, color: C.ink, align: "right", lineGap: 1 }) + 3;
  [id.owner, id.phone, id.email, id.address, id.gstin && `GSTIN: ${id.gstin}`].filter(Boolean).forEach((l) => {
    ry += para(doc, l, rightX, ry, colW, { size: 9, color: C.text, align: "right", lineGap: 1 }) + 2;
  });

  y = Math.max(ly, ry) + 10;

  /* ---------- date + PAID ---------- */
  put(doc, "Date:", P, y + 3, { font: "Helvetica-Bold", size: 10, color: C.ink });
  put(doc, pay.paid_on ? U.fmtDate(pay.paid_on) : "-", P + 32, y + 3, { size: 10, color: C.text });
  pill(doc, "PAID", W - P - 58, y, { bg: C.greenSoft, fg: C.green, border: C.greenSoft, size: 9, h: 22, padX: 16 });
  y += 36;

  /* ---------- bordered table: Description | Qty | Price | Total ---------- */
  const wQty = 40;
  const wPrice = 78;
  const wTotal = 84;
  const wDesc = CW - (wQty + wPrice + wTotal);
  const xQty = P + wDesc;
  const xPrice = xQty + wQty;
  const xTotal = xPrice + wPrice;

  const TH = 26;
  doc.rect(P, y, CW, TH).fill(C.navy);
  const hdr = { font: "Helvetica-Bold", size: 9, color: C.white };
  put(doc, "Description", P, y + 9, { ...hdr, width: wDesc, align: "center" });
  put(doc, "Qty", xQty, y + 9, { ...hdr, width: wQty, align: "center" });
  put(doc, "Price", xPrice, y + 9, { ...hdr, width: wPrice, align: "center" });
  put(doc, "Total", xTotal, y + 9, { ...hdr, width: wTotal, align: "center" });
  [xQty, xPrice, xTotal].forEach((gx) => vline(doc, gx, y + 5, y + TH - 5, "#6f8fcf", 0.6));
  const tableTop = y;
  y += TH;

  const planName = ms && ms.plan_name ? ms.plan_name : "Payment received";
  const period = ms ? `${U.fmtDate(ms.start_date)}  to  ${U.fmtDate(ms.end_date)}` : "";
  const nameH = paraH(doc, planName, wDesc - 16, "Helvetica-Bold", 9.5, 0);
  const periodH = period ? paraH(doc, period, wDesc - 16, "Helvetica", 8.5, 0) + 3 : 0;
  const rowH = Math.max(nameH + periodH + 16, 34);
  para(doc, planName, P + 8, y + 8, wDesc - 16, { font: "Helvetica-Bold", size: 9.5, color: C.ink, lineGap: 0 });
  if (period) para(doc, period, P + 8, y + 8 + nameH + 3, wDesc - 16, { size: 8.5, color: C.muted, lineGap: 0 });
  put(doc, "1", xQty, y + 8, { size: 9.5, color: C.text, width: wQty, align: "center" });
  put(doc, `Rs. ${U.inr(pay.amount)}`, xPrice, y + 8, { size: 9.5, color: C.text, width: wPrice - 8, align: "right" });
  put(doc, `Rs. ${U.inr(pay.amount)}`, xTotal, y + 8, { font: "Helvetica-Bold", size: 9.5, color: C.ink, width: wTotal - 8, align: "right" });
  y += rowH;
  doc.rect(P, tableTop, CW, y - tableTop).lineWidth(0.8).strokeColor(C.grid).stroke();
  [xQty, xPrice, xTotal].forEach((gx) => vline(doc, gx, tableTop + TH, y, C.grid, 0.6));
  y += 14;

  /* ---------- amount bar (right) + payment information (left) ---------- */
  const barW = 215;
  const barX = W - P - barW;
  const rate = ms ? Number(ms.tax_rate) : 0;
  let ty = y;
  if (rate > 0) {
    const amt = Number(pay.amount);
    const tax = U.money((amt * rate) / (100 + rate)); // prices are GST-inclusive
    put(doc, "Taxable Value", barX + 14, ty, { size: 9, color: C.muted });
    put(doc, `Rs. ${U.inr(amt - tax)}`, barX + 100, ty, { size: 9, color: C.muted, width: barW - 114, align: "right" });
    ty += 16;
    put(doc, `GST @ ${rate}% (included)`, barX + 14, ty, { size: 9, color: C.muted });
    put(doc, `Rs. ${U.inr(tax)}`, barX + 100, ty, { size: 9, color: C.muted, width: barW - 114, align: "right" });
    ty += 20;
  }
  navyBar(doc, barX, ty, barW, 32, "Amount Received", `Rs. ${U.inr(pay.amount)}`, { size: 10.5 });
  ty += 32;

  if (ms) {
    const bal = U.money(Number(ms.total_amount) - Number(ms.amount_paid));
    ty += 8;
    if (bal > 0) {
      doc.rect(barX, ty, barW, 28).lineWidth(1.1).fillAndStroke(C.redSoft, C.red);
      put(doc, "Balance Due", barX + 14, ty + 9.5, { font: "Helvetica-Bold", size: 10, color: C.red });
      put(doc, `Rs. ${U.inr(bal)}`, barX + 100, ty + 9.5, { font: "Helvetica-Bold", size: 10, color: C.red, width: barW - 114, align: "right" });
    } else {
      doc.rect(barX, ty, barW, 28).lineWidth(1.1).fillAndStroke(C.greenSoft, C.green);
      put(doc, "Fully Paid", barX, ty + 9.5, { font: "Helvetica-Bold", size: 10, color: C.green, width: barW, align: "center" });
    }
    ty += 28;
  }

  put(doc, "Payment Information:", P, y, { font: "Helvetica-Bold", size: 11, color: C.ink });
  let py = y + 20;
  const payRows = [
    ["Mode", modeLabel(pay.mode)],
    pay.reference && ["Reference", pay.reference],
    ["Received by", pay.received_by || "-"]
  ].filter(Boolean);
  payRows.forEach(([k, v]) => {
    put(doc, `${k}:`, P, py, { font: "Helvetica-Bold", size: 9, color: C.ink });
    putFit(doc, v, P + 66, py, barX - P - 66 - 10, { size: 9, minSize: 6.5, color: C.text });
    py += 16;
  });

  y = Math.max(ty, py) + 20;

  /* ---------- thank you ---------- */
  const tyY = H - 118;
  put(doc, "Thank You!", P, tyY, { size: 24, color: C.ink, width: CW, align: "right" });
  putFit(doc, `Thank you for training with ${id.name}.`, P, tyY + 8, CW - 150, { font: "Helvetica-Bold", size: 9, minSize: 6.5, color: C.ink });

  /* ---------- footer ---------- */
  const fy = H - 46;
  hline(doc, P, W - P, fy, C.line, 0.75);
  putFit(doc, "This is a computer generated receipt, no signature needed.", P, fy + 10, CW, { size: 7.5, minSize: 5.5, color: C.muted, align: "center" });
  const contact = [id.phone, id.email].filter(Boolean).join("   |   ");
  if (contact) putFit(doc, contact, P, fy + 22, CW, { size: 7.5, minSize: 5.5, color: C.muted, align: "center" });
  doc.end();
}

module.exports = { receiptPdf };