const PDFDocument = require("pdfkit");
const U = require("./gym.utils");
const { PAL: C, put, putFit, para, paraH, hline, vline, drawWave, drawTopStrip, navyBar } = require("../billing/pdf.theme");

// Streams a bill as a PDF. Prices are GST inclusive, so the tax line shows what is already inside the total.
function render(res, venue, sale, { inline = false, terms = "" } = {}) {
  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, info: { Title: `Invoice ${sale.invoice_no}`, Author: venue.hall_name || "In2Fest" } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${String(sale.invoice_no).replace(/[^\w-]+/g, "_")}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;
  const H = doc.page.height;
  const MX = 40;
  const CW = W - MX * 2;
  const BOTTOM = H - 58;
  const cancelled = sale.status === "cancelled";
  const gst = !!(venue.gst_enabled && venue.gst_number);
  const docLabel = gst ? "TAX INVOICE" : "INVOICE";
  const shopName = venue.hall_name || "Store";
  let y = 0;

  const newPage = () => {
    doc.addPage();
    drawTopStrip(doc);
    put(doc, `${docLabel}  |  ${sale.invoice_no}  (continued)`, MX, 22, { size: 8.5, color: C.muted });
    y = 46;
  };
  const ensure = (h) => {
    if (y + h > BOTTOM) newPage();
  };

  /* ---------- wave header ---------- */
  const HEAD_H = 112;
  drawWave(doc, HEAD_H);
  put(doc, docLabel, MX, 26, { font: "Helvetica-Bold", size: gst ? 30 : 34, color: C.white, spacing: 1 });
  putFit(doc, shopName, MX, 70, 300, { font: "Helvetica", size: 11, minSize: 8, color: "#c7d8f7" });
  putFit(doc, `NO: ${sale.invoice_no}`, MX + CW - 220, 38, 220, { font: "Helvetica-Bold", size: 13, minSize: 8, color: C.white, align: "right" });
  y = HEAD_H + 20;

  /* ---------- Bill To | From ---------- */
  const colW = (CW - 30) / 2;
  const rightX = MX + CW - colW;

  put(doc, "Bill To:", MX, y, { font: "Helvetica-Bold", size: 15, color: C.ink });
  let ly = y + 24;
  ly += para(doc, sale.customer_name || "Walk-in customer", MX, ly, colW, { font: "Helvetica-Bold", size: 11, color: C.ink, lineGap: 1 }) + 4;
  if (sale.customer_phone) ly += para(doc, String(sale.customer_phone), MX, ly, colW, { size: 10, color: C.text, lineGap: 1 }) + 3;

  put(doc, "From:", rightX, y, { font: "Helvetica-Bold", size: 15, color: C.ink, width: colW, align: "right" });
  let ry = y + 24;
  ry += para(doc, shopName, rightX, ry, colW, { font: "Helvetica-Bold", size: 11, color: C.ink, align: "right", lineGap: 1 }) + 4;
  [venue.phone, venue.address, gst && `GSTIN: ${venue.gst_number}`].filter(Boolean).forEach((l) => {
    ry += para(doc, String(l), rightX, ry, colW, { size: 10, color: C.text, align: "right", lineGap: 1 }) + 3;
  });

  y = Math.max(ly, ry) + 12;
  put(doc, "Date:", MX, y, { font: "Helvetica-Bold", size: 10, color: C.ink });
  put(doc, U.fmtDate(sale.sold_on), MX + 32, y, { size: 10, color: C.text });
  if (cancelled) put(doc, "CANCELLED", MX + CW - 120, y - 2, { font: "Helvetica-Bold", size: 13, color: C.red, width: 120, align: "right" });
  y += 28;

  /* ---------- bordered item table ---------- */
  const wQty = 56;
  const wPrice = 96;
  const wTotal = 104;
  const wDesc = CW - (wQty + wPrice + wTotal);
  const xQty = MX + wDesc;
  const xPrice = xQty + wQty;
  const xTotal = xPrice + wPrice;
  const gridX = [xQty, xPrice, xTotal];
  const TH = 28;

  const drawTableHeader = (top) => {
    doc.rect(MX, top, CW, TH).fill(C.navy);
    const hdr = { font: "Helvetica-Bold", size: 9.5, color: C.white };
    put(doc, "Description", MX, top + 10, { ...hdr, width: wDesc, align: "center" });
    put(doc, "Qty", xQty, top + 10, { ...hdr, width: wQty, align: "center" });
    put(doc, "Price", xPrice, top + 10, { ...hdr, width: wPrice, align: "center" });
    put(doc, "Total", xTotal, top + 10, { ...hdr, width: wTotal, align: "center" });
    gridX.forEach((gx) => vline(doc, gx, top + 5, top + TH - 5, "#6f8fcf", 0.6));
    return top + TH;
  };

  ensure(TH + 40);
  let segTop = y;
  y = drawTableHeader(y);
  const closeSegment = () => {
    doc.rect(MX, segTop, CW, y - segTop).lineWidth(0.8).strokeColor(C.grid).stroke();
    gridX.forEach((gx) => vline(doc, gx, segTop + TH, y, C.grid, 0.6));
  };

  (sale.items || []).forEach((l) => {
    const name = `${l.name}${l.variant_label ? ` (${l.variant_label})` : ""}`;
    const h = paraH(doc, name, wDesc - 16, "Helvetica", 10, 0);
    const rowH = Math.max(h + 12, 24);
    if (y + rowH > BOTTOM) {
      closeSegment();
      newPage();
      segTop = y;
      y = drawTableHeader(y);
    }
    para(doc, name, MX + 8, y + 7, wDesc - 16, { size: 10, color: C.ink, lineGap: 0 });
    put(doc, String(l.qty), xQty, y + 7, { size: 10, color: C.text, width: wQty, align: "center" });
    put(doc, `Rs. ${U.inr(l.price)}`, xPrice, y + 7, { size: 10, color: C.text, width: wPrice - 8, align: "right" });
    put(doc, `Rs. ${U.inr(l.amount)}`, xTotal, y + 7, { font: "Helvetica-Bold", size: 10, color: C.ink, width: wTotal - 8, align: "right" });
    y += rowH;
    hline(doc, MX, MX + CW, y, C.line, 0.6);
  });
  closeSegment();
  y += 16;

  /* ---------- totals ---------- */
  const totalsW = 250;
  const totalsX = MX + CW - totalsW;
  const discount = Number(sale.line_discount || 0) + Number(sale.discount || 0);
  const rows = [];
  if (discount > 0) rows.push({ label: "Discount", value: `- Rs. ${U.inr(discount)}`, muted: true });
  if (sale.tax_amount > 0) rows.push({ label: "Includes GST", value: `Rs. ${U.inr(sale.tax_amount)}`, muted: true });
  const showBalance = sale.balance > 0 && !cancelled;
  ensure(rows.length * 18 + 4 + 32 + 8 + 18 + (showBalance ? 32 : 0) + 10);

  let ty = y;
  rows.forEach((r) => {
    put(doc, r.label, totalsX + 14, ty, { size: 10, color: C.muted });
    put(doc, r.value, totalsX + 100, ty, { size: 10, color: C.muted, width: totalsW - 114, align: "right" });
    ty += 18;
  });
  ty += 4;
  navyBar(doc, totalsX, ty, totalsW, 32, "Total", `Rs. ${U.inr(sale.total)}`, { size: 11.5 });
  ty += 32 + 8;
  put(doc, "Amount Paid", totalsX + 14, ty, { size: 10, color: C.green });
  put(doc, `Rs. ${U.inr(sale.amount_paid)}`, totalsX + 100, ty, { font: "Helvetica-Bold", size: 10, color: C.green, width: totalsW - 114, align: "right" });
  ty += 18;
  if (showBalance) {
    doc.rect(totalsX, ty, totalsW, 32).lineWidth(1.2).fillAndStroke(C.redSoft, C.red);
    put(doc, "Balance Due", totalsX + 14, ty + 11, { font: "Helvetica-Bold", size: 11.5, color: C.red });
    put(doc, `Rs. ${U.inr(sale.balance)}`, totalsX + 110, ty + 11, { font: "Helvetica-Bold", size: 11.5, color: C.red, width: totalsW - 124, align: "right" });
    ty += 32;
  }

  // terms (left, beside the totals)
  const termW = CW - totalsW - 24;
  const termLines = String(terms || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (termLines.length) {
    let ny = y;
    put(doc, "Note:", MX, ny, { font: "Helvetica-Bold", size: 11, color: C.ink });
    hline(doc, MX + 40, MX + termW, ny + 12, C.line, 0.6);
    ny += 20;
    termLines.forEach((t) => {
      const h = paraH(doc, t, termW - 6, "Helvetica", 8.5, 0);
      if (ny + h > BOTTOM) return;
      para(doc, t, MX + 2, ny, termW - 6, { size: 8.5, color: C.muted, lineGap: 0 });
      ny += h + 3;
    });
    ty = Math.max(ty, ny);
  }
  y = ty + 20;

  /* ---------- thank you ---------- */
  ensure(50);
  put(doc, "Thank You!", MX, Math.max(y, BOTTOM - 40), { size: 26, color: C.ink, width: CW, align: "right" });

  /* ---------- footer on every page ---------- */
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const fy = H - 42;
    hline(doc, MX, MX + CW, fy, C.line, 0.75);
    put(doc, `${shopName}  |  ${sale.invoice_no}`, MX, fy + 9, { size: 7.5, color: C.muted });
    put(doc, `Page ${i + 1} of ${range.count}`, MX, fy + 9, { size: 7.5, color: C.muted, width: CW, align: "right" });
    put(doc, "This is a computer generated bill.", MX, fy + 21, { size: 7.5, color: C.muted, width: CW, align: "center" });
  }
  doc.end();
}

module.exports = { render };