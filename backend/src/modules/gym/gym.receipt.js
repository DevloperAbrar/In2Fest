const PDFDocument = require("pdfkit");
const { GymPayment, GymMember, GymMembership } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Streams a downloadable receipt PDF. The vendor saves it and shares it however they like.
async function receiptPdf({ venue }, paymentId, res) {
  const pay = UUID_RE.test(String(paymentId))
    ? await GymPayment.findOne({ where: { id: paymentId, venue_id: venue.id, status: "paid" } })
    : null;
  if (!pay) throw new AppError("Receipt not found", 404);
  const [member, ms] = await Promise.all([
    GymMember.findByPk(pay.member_id),
    pay.membership_id ? GymMembership.findByPk(pay.membership_id) : null
  ]);

  const doc = new PDFDocument({ size: "A5", margin: 36 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${String(pay.receipt_no || "receipt").replace(/[^\w-]+/g, "_")}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).fillColor("#111").text(venue.hall_name, 36);
  doc.fontSize(9).fillColor("#666");
  [venue.address, venue.phone && `Phone: ${venue.phone}`, venue.gst_enabled && venue.gst_number && `GSTIN: ${venue.gst_number}`]
    .filter(Boolean).forEach((s) => doc.text(String(s), 36));

  doc.moveDown(0.8).fontSize(13).fillColor("#16a34a").text("PAYMENT RECEIPT", 36);
  doc.moveDown(0.5);

  const rows = [
    ["Receipt no.", pay.receipt_no || "-"],
    ["Date", pay.paid_on ? U.fmtDate(pay.paid_on) : "-"],
    ["Member", member ? `${member.name} (${member.member_code})` : "-"],
    ["Mobile", member ? member.phone : "-"],
    ["Plan", ms ? ms.plan_name : "-"],
    ["Period", ms ? `${U.fmtDate(ms.start_date)} to ${U.fmtDate(ms.end_date)}` : "-"],
    ["Mode", String(pay.mode).replace(/_/g, " ").toUpperCase()]
  ];
  if (pay.reference) rows.push(["Reference", pay.reference]);
  rows.forEach(([k, v]) => {
    const y = doc.y;
    doc.fontSize(9).fillColor("#888").text(k, 36, y, { width: 90 });
    doc.fontSize(10).fillColor("#111").text(String(v), 130, y, { width: 240 });
    doc.moveDown(0.3);
  });

  doc.moveDown(0.8);
  doc.fontSize(18).fillColor("#111").text(`Amount received: Rs. ${U.inr(pay.amount)}`, 36);

  const rate = ms ? Number(ms.tax_rate) : 0;
  if (rate > 0) {
    const amt = Number(pay.amount);
    const tax = U.money((amt * rate) / (100 + rate)); // prices are GST-inclusive
    doc.moveDown(0.3).fontSize(9).fillColor("#666")
      .text(`Includes GST @ ${rate}%: Rs. ${U.inr(tax)} (taxable value Rs. ${U.inr(amt - tax)})`, 36);
  }
  if (ms) {
    const bal = U.money(Number(ms.total_amount) - Number(ms.amount_paid));
    doc.moveDown(0.3).fontSize(10).fillColor(bal > 0 ? "#dc2626" : "#16a34a")
      .text(bal > 0 ? `Balance due on this membership: Rs. ${U.inr(bal)}` : "Fully paid", 36);
  }
  doc.moveDown(1.5).fontSize(8).fillColor("#999")
    .text(`Received by ${pay.received_by || "-"}. This is a computer generated receipt.`, 36);
  doc.end();
}

module.exports = { receiptPdf };