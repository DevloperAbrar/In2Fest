const PDFDocument = require("pdfkit");
const U = require("./gym.utils");

// Streams a bill as a PDF. Prices are GST inclusive, so the tax line shows what is already inside the total.
function render(res, venue, sale, { inline = false, terms = "" } = {}) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${String(sale.invoice_no).replace(/[^\w-]+/g, "_")}.pdf"`);
  doc.pipe(res);

  const gst = venue.gst_enabled && venue.gst_number;
  doc.fontSize(20).fillColor("#111").text(venue.hall_name, 40);
  doc.fontSize(9).fillColor("#666");
  [venue.address, venue.phone && `Phone: ${venue.phone}`, gst && `GSTIN: ${venue.gst_number}`].filter(Boolean).forEach((s) => doc.text(String(s), 40));

  doc.moveDown(0.8).fontSize(14).fillColor("#16a34a").text(gst ? "TAX INVOICE" : "INVOICE", 40);
  if (sale.status === "cancelled") doc.fontSize(12).fillColor("#dc2626").text("CANCELLED", 40);
  doc.moveDown(0.3).fontSize(10).fillColor("#111").text(`Bill no: ${sale.invoice_no}     Date: ${U.fmtDate(sale.sold_on)}`, 40);
  doc.text(`Customer: ${sale.customer_name}${sale.customer_phone ? ` (${sale.customer_phone})` : ""}`, 40);

  const col = { n: 40, item: 62, qty: 330, rate: 385, amt: 465 };
  let y = doc.moveDown(0.8).y;
  doc.fontSize(9).fillColor("#888");
  doc.text("#", col.n, y).text("Item", col.item, y).text("Qty", col.qty, y).text("Rate", col.rate, y).text("Amount", col.amt, y);
  y += 16;
  (sale.items || []).forEach((l, i) => {
    const name = `${l.name}${l.variant_label ? ` (${l.variant_label})` : ""}`;
    const h = Math.max(doc.fontSize(10).heightOfString(name, { width: 260 }), 12);
    if (y + h > 740) { doc.addPage(); y = 40; }
    doc.fillColor("#111").text(String(i + 1), col.n, y).text(name, col.item, y, { width: 260 })
      .text(String(l.qty), col.qty, y).text(U.inr(l.price), col.rate, y).text(U.inr(l.amount), col.amt, y);
    y += h + 6;
  });

  const line = (label, value, color = "#111", size = 10) => {
    if (y > 760) { doc.addPage(); y = 40; }
    doc.fontSize(size).fillColor("#666").text(label, 330, y, { width: 130 }).fillColor(color).text(value, 465, y, { width: 90 });
    y += size + 6;
  };
  y += 6;
  if (sale.line_discount > 0 || sale.discount > 0) line("Discount", `- Rs. ${U.inr(Number(sale.line_discount) + Number(sale.discount))}`);
  line("Total", `Rs. ${U.inr(sale.total)}`, "#111", 13);
  if (sale.tax_amount > 0) line("Includes GST", `Rs. ${U.inr(sale.tax_amount)}`, "#666", 9);
  line("Paid", `Rs. ${U.inr(sale.amount_paid)}`, "#16a34a");
  if (sale.balance > 0 && sale.status !== "cancelled") line("Balance due", `Rs. ${U.inr(sale.balance)}`, "#dc2626");

  doc.fontSize(8).fillColor("#999");
  if (terms) doc.text(terms, 40, Math.max(y + 20, doc.y), { width: 515 });
  doc.text("This is a computer generated bill.", 40, doc.y + 8);
  doc.end();
}

module.exports = { render };