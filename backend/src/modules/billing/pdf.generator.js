const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const env = require("../../config/env");

const BRAND = "#6d28d9";
const BRAND_LIGHT = "#f5f3ff";
const BRAND_PALE = "#ede9fe";
const TEXT_DARK = "#1f2937";
const TEXT_MUTED = "#6b7280";
const BORDER = "#e5e7eb";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function money(val) {
  return `Rs. ${Number(val || 0).toFixed(2)}`;
}

function statusColor(status) {
  if (status === "paid") return { bg: "#dcfce7", fg: "#15803d" };
  if (status === "sent") return { bg: "#dbeafe", fg: "#1d4ed8" };
  return { bg: "#f3f4f6", fg: "#4b5563" };
}

async function generateInvoicePdf(invoice, venue, client) {
  const dir = path.join(process.cwd(), env.upload.dir, "invoices");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fileName = `${invoice.type}-${invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, "")}.pdf`;
  const filePath = path.join(dir, fileName);

  // Verification QR  - encodes a link to the public verify page, using invoice.id (UUID) as the token
  const verifyUrl = `${FRONTEND_URL}/verify/${invoice.id}`;
  let verifyQrBuffer = null;
  try {
    verifyQrBuffer = await QRCode.toBuffer(verifyUrl, { width: 200, margin: 1 });
  } catch {
    verifyQrBuffer = null;
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const marginX = 50;
    const contentWidth = pageWidth - marginX * 2;

    // ---------- Header band ----------
    const headerHeight = 110;
    doc.rect(0, 0, pageWidth, headerHeight).fill(BRAND);

    doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold")
      .text(venue.hall_name || "Venue", marginX, 28, { width: 280 });

    doc.fillColor(BRAND_PALE).fontSize(9).font("Helvetica");
    let headerLineY = 54;
    if (venue.address) { doc.text(venue.address, marginX, headerLineY, { width: 280 }); headerLineY += 13; }
    if (venue.phone) { doc.text(venue.phone, marginX, headerLineY, { width: 280 }); headerLineY += 13; }
    if (invoice.gst_enabled && venue.gst_number) {
      doc.text(`GSTIN: ${venue.gst_number}`, marginX, headerLineY, { width: 280 });
    }

    const docLabel = invoice.type === "invoice" ? "TAX INVOICE" : "QUOTATION";
    doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold")
      .text(docLabel, marginX, 28, { width: contentWidth, align: "right" });

    doc.fillColor(BRAND_PALE).fontSize(9).font("Helvetica");
    doc.text(`No: ${invoice.invoice_number}`, marginX, 54, { width: contentWidth, align: "right" });
    doc.text(
      `Date: ${new Date(invoice.created_at || Date.now()).toLocaleDateString("en-IN")}`,
      marginX, 67, { width: contentWidth, align: "right" }
    );
    if (invoice.validity_date) {
      doc.text(
        `Valid Until: ${new Date(invoice.validity_date).toLocaleDateString("en-IN")}`,
        marginX, 80, { width: contentWidth, align: "right" }
      );
    }

    // ---------- Bill To / Invoice details boxes ----------
    let y = headerHeight + 25;
    const boxHeight = 88;
    const boxWidth = (contentWidth - 16) / 2;

    // Bill To box
    doc.roundedRect(marginX, y, boxWidth, boxHeight, 6).fillAndStroke(BRAND_LIGHT, BORDER);
    doc.fillColor(BRAND).fontSize(9).font("Helvetica-Bold").text("BILL TO", marginX + 14, y + 12);
    doc.fillColor(TEXT_DARK).fontSize(11).font("Helvetica-Bold")
      .text(client?.name || "Client", marginX + 14, y + 28, { width: boxWidth - 28 });
    doc.fillColor(TEXT_MUTED).fontSize(9).font("Helvetica");
    let billY = y + 44;
    if (client?.phone) { doc.text(client.phone, marginX + 14, billY, { width: boxWidth - 28 }); billY += 13; }
    if (client?.email) { doc.text(client.email, marginX + 14, billY, { width: boxWidth - 28 }); billY += 13; }
    if (client?.address) { doc.text(client.address, marginX + 14, billY, { width: boxWidth - 28 }); }

    // Invoice details box
    const box2X = marginX + boxWidth + 16;
    doc.roundedRect(box2X, y, boxWidth, boxHeight, 6).fillAndStroke("#ffffff", BORDER);
    doc.fillColor(BRAND).fontSize(9).font("Helvetica-Bold").text("INVOICE DETAILS", box2X + 14, y + 12);

    const sc = statusColor(invoice.status);
    doc.roundedRect(box2X + boxWidth - 78, y + 10, 64, 16, 8).fill(sc.bg);
    doc.fillColor(sc.fg).fontSize(8).font("Helvetica-Bold")
      .text((invoice.status || "draft").toUpperCase(), box2X + boxWidth - 78, y + 14, { width: 64, align: "center" });

    doc.fillColor(TEXT_DARK).fontSize(9).font("Helvetica");
    let detY = y + 34;
    doc.text(`Invoice #: ${invoice.invoice_number}`, box2X + 14, detY, { width: boxWidth - 28 }); detY += 15;
    doc.text(`Date: ${new Date(invoice.created_at || Date.now()).toLocaleDateString("en-IN")}`, box2X + 14, detY, { width: boxWidth - 28 }); detY += 15;
    if (invoice.validity_date) {
      doc.text(`Valid Until: ${new Date(invoice.validity_date).toLocaleDateString("en-IN")}`, box2X + 14, detY, { width: boxWidth - 28 });
    }

    y += boxHeight + 28;

    // ---------- Line items table ----------
    const colDesc = marginX;
    const colDescW = 195;
    const colQty = colDesc + colDescW;
    const colQtyW = 40;
    const colRate = colQty + colQtyW;
    const colRateW = 75;
    const colDisc = colRate + colRateW;
    const colDiscW = 75;
    const colAmt = colDisc + colDiscW;
    const colAmtW = contentWidth - (colDescW + colQtyW + colRateW + colDiscW);

    const rowHeaderH = 26;
    doc.rect(marginX, y, contentWidth, rowHeaderH).fill(BRAND);
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
    doc.text("DESCRIPTION", colDesc + 10, y + 8, { width: colDescW - 10 });
    doc.text("QTY", colQty, y + 8, { width: colQtyW, align: "center" });
    doc.text("RATE", colRate, y + 8, { width: colRateW, align: "right" });
    doc.text("DISCOUNT", colDisc, y + 8, { width: colDiscW, align: "right" });
    doc.text("AMOUNT", colAmt, y + 8, { width: colAmtW - 10, align: "right" });

    y += rowHeaderH;
    const rowH = 24;

    (invoice.line_items || []).forEach((item, idx) => {
      const discountLabel =
        item.discount_type === "percentage" && Number(item.discount_value) > 0
          ? `${item.discount_value}%`
          : item.discount_type === "flat" && Number(item.discount_value) > 0
          ? money(item.discount_value)
          : " -";

      if (idx % 2 === 1) {
        doc.rect(marginX, y, contentWidth, rowH).fill(BRAND_LIGHT);
      }

      doc.fillColor(TEXT_DARK).fontSize(9).font("Helvetica");
      doc.text(item.description || " -", colDesc + 10, y + 7, { width: colDescW - 10 });
      doc.text(String(item.quantity), colQty, y + 7, { width: colQtyW, align: "center" });
      doc.text(money(item.rate), colRate, y + 7, { width: colRateW, align: "right" });
      doc.fillColor(TEXT_MUTED).text(discountLabel, colDisc, y + 7, { width: colDiscW, align: "right" });
      doc.fillColor(TEXT_DARK).font("Helvetica-Bold")
        .text(money(item.amount), colAmt, y + 7, { width: colAmtW - 10, align: "right" });

      y += rowH;
    });

    doc.moveTo(marginX, y).lineTo(marginX + contentWidth, y).strokeColor(BORDER).stroke();
    y += 20;

    // ---------- Totals box ----------
    const totalsBoxW = 240;
    const totalsX = marginX + contentWidth - totalsBoxW;
    let totalsY = y;
    const lineGap = 18;

    const drawTotalLine = (label, value, opts = {}) => {
      doc.fillColor(opts.muted ? TEXT_MUTED : TEXT_DARK)
        .fontSize(opts.big ? 13 : 9.5)
        .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
        .text(label, totalsX, totalsY, { width: totalsBoxW - 100 });
      doc.fillColor(opts.accent ? BRAND : (opts.muted ? TEXT_MUTED : TEXT_DARK))
        .fontSize(opts.big ? 13 : 9.5)
        .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
        .text(value, totalsX + totalsBoxW - 100, totalsY, { width: 100, align: "right" });
      totalsY += opts.big ? 22 : lineGap;
    };

    drawTotalLine("Subtotal", money(invoice.subtotal));

    if (invoice.discount_type !== "none" && Number(invoice.discount_amount) > 0) {
      const label = invoice.discount_type === "percentage" ? `Discount (${invoice.discount_value}%)` : "Discount (flat)";
      drawTotalLine(label, `-${money(invoice.discount_amount)}`, { muted: true });
      drawTotalLine("Taxable Amount", money(invoice.taxable_amount));
    }

    if (invoice.gst_enabled) {
      const halfRate = Number(invoice.gst_rate) / 2;
      drawTotalLine(`CGST (${halfRate}%)`, money(invoice.cgst_amount), { muted: true });
      drawTotalLine(`SGST (${halfRate}%)`, money(invoice.sgst_amount), { muted: true });
    }

    doc.moveTo(totalsX, totalsY + 2).lineTo(totalsX + totalsBoxW, totalsY + 2).strokeColor(BORDER).stroke();
    totalsY += 12;

    drawTotalLine("Total", money(invoice.total), { big: true, bold: true, accent: true });

    const totalsBottom = totalsY + 10;

    // ---------- Payment section: QR box + Bank details box side by side ----------
    const hasQr = !!invoice.qr_code_url && fs.existsSync(
      path.join(process.cwd(), (invoice.qr_code_url || "").replace("/uploads", "uploads"))
    );
    const bank = venue.bank_details || {};
    const hasBankDetails = !!(bank.account_number || bank.beneficiary_name || bank.bank_name || bank.ifsc_code);

    let paymentBottom = y;

    if (hasQr || hasBankDetails) {
      const paymentTitleY = y;
      doc.fillColor(BRAND).fontSize(9).font("Helvetica-Bold").text("PAYMENT OPTIONS", marginX, paymentTitleY);
      const paymentBoxTop = paymentTitleY + 16;

      const qrBoxW = 170;
      const qrBoxH = 190;

      if (hasQr) {
        const qrPath = path.join(process.cwd(), invoice.qr_code_url.replace("/uploads", "uploads"));
        doc.roundedRect(marginX, paymentBoxTop, qrBoxW, qrBoxH, 6).stroke(BORDER);
        doc.fillColor(TEXT_DARK).fontSize(8.5).font("Helvetica-Bold")
          .text("Scan & Pay via UPI", marginX, paymentBoxTop + 12, { width: qrBoxW, align: "center" });
        doc.image(qrPath, marginX + (qrBoxW - 115) / 2, paymentBoxTop + 30, { width: 115 });
        doc.fillColor(TEXT_MUTED).fontSize(8).font("Helvetica")
          .text(`Amount: ${money(invoice.total)}`, marginX, paymentBoxTop + 158, { width: qrBoxW, align: "center" });
      }

      if (hasBankDetails) {
        const bankBoxX = hasQr ? marginX + qrBoxW + 16 : marginX;
        const bankBoxW = hasQr ? contentWidth - qrBoxW - 16 : contentWidth;

        const bankRows = [
          bank.beneficiary_name && ["Beneficiary Name", bank.beneficiary_name],
          bank.account_number && ["Account Number", bank.account_number],
          bank.bank_name && ["Bank Name", bank.bank_name],
          bank.ifsc_code && ["IFSC Code", bank.ifsc_code],
          bank.branch_address && ["Branch Address", bank.branch_address]
        ].filter(Boolean);

        const bankRowH = 22;
        const bankBoxH = Math.max(qrBoxH, 40 + bankRows.length * bankRowH);

        doc.roundedRect(bankBoxX, paymentBoxTop, bankBoxW, bankBoxH, 6).fillAndStroke("#ffffff", BORDER);
        doc.fillColor(TEXT_DARK).fontSize(8.5).font("Helvetica-Bold")
          .text("Bank Transfer (NEFT / IMPS)", bankBoxX + 14, paymentBoxTop + 12, { width: bankBoxW - 28 });

        let rowY = paymentBoxTop + 34;
        const labelW = 120;
        bankRows.forEach(([label, value]) => {
          doc.fillColor(TEXT_MUTED).fontSize(8.5).font("Helvetica")
            .text(label, bankBoxX + 14, rowY, { width: labelW });
          doc.fillColor(TEXT_DARK).fontSize(8.5).font("Helvetica-Bold")
            .text(value, bankBoxX + 14 + labelW, rowY, { width: bankBoxW - 28 - labelW });
          rowY += bankRowH;
        });

        paymentBottom = Math.max(paymentBottom, paymentBoxTop + bankBoxH);
      }

      if (hasQr) {
        paymentBottom = Math.max(paymentBottom, paymentBoxTop + qrBoxH);
      }
    }

    y = Math.max(totalsBottom, paymentBottom) + 20;

    // ---------- Terms ----------
    if (invoice.terms) {
      doc.fillColor(BRAND).fontSize(9).font("Helvetica-Bold").text("TERMS & CONDITIONS", marginX, y);
      y += 14;
      doc.fillColor(TEXT_MUTED).fontSize(8.5).font("Helvetica").text(invoice.terms, marginX, y, { width: contentWidth });
      y += 30;
    }

    // ---------- Authenticity verification strip ----------
    if (verifyQrBuffer) {
      const stripH = 70;
      const stripY = Math.max(y, doc.page.height - 150);

      doc.roundedRect(marginX, stripY, contentWidth, stripH, 6).fillAndStroke("#fafafa", BORDER);
      doc.image(verifyQrBuffer, marginX + 14, stripY + 8, { width: 54 });

      doc.fillColor(TEXT_DARK).fontSize(9).font("Helvetica-Bold")
        .text("Verify this document's authenticity", marginX + 80, stripY + 14, { width: contentWidth - 100 });
      doc.fillColor(TEXT_MUTED).fontSize(8).font("Helvetica")
        .text("Scan the QR code with any smartphone camera to confirm this document was issued by this venue.", marginX + 80, stripY + 30, { width: contentWidth - 100 });
      doc.fillColor(BRAND).fontSize(8).font("Helvetica")
        .text(verifyUrl, marginX + 80, stripY + 48, { width: contentWidth - 100 });
    }

    // ---------- Footer ----------
    const footerY = doc.page.height - 50;
    doc.moveTo(marginX, footerY).lineTo(marginX + contentWidth, footerY).strokeColor(BORDER).stroke();
    doc.fillColor(TEXT_MUTED).fontSize(8).font("Helvetica")
      .text("This is a computer-generated document and does not require a signature.", marginX, footerY + 10, {
        width: contentWidth,
        align: "center"
      });
    doc.text("Generated via In2Fest", marginX, footerY + 22, { width: contentWidth, align: "center" });

    doc.end();

    stream.on("finish", () => resolve(`/uploads/invoices/${fileName}`));
    stream.on("error", reject);
  });
}

module.exports = { generateInvoicePdf };