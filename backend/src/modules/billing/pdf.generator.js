const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */
const C = {
  brand: "#6d28d9",
  brandSoft: "#f5f3ff",
  ink: "#111827",
  text: "#374151",
  muted: "#6b7280",
  line: "#e5e7eb",
  soft: "#f9fafb",
  white: "#ffffff"
};

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 1234567.5 -> "12,34,567.50"  (Indian digit grouping, no ICU dependency)
function formatINR(val) {
  const num = Number(val) || 0;
  const [intPart, dec] = Math.abs(num).toFixed(2).split(".");
  let last3 = intPart.slice(-3);
  let rest = intPart.slice(0, -3);
  if (rest) last3 = "," + last3;
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${num < 0 ? "-" : ""}${rest}${last3}.${dec}`;
}

// Helvetica has no rupee glyph, so "Rs." is used to keep the PDF portable.
function money(val) {
  return `Rs. ${formatINR(val)}`;
}

function fmtDate(value) {
  if (!value) return "";
  // DATEONLY values arrive as "YYYY-MM-DD" - parse by hand to avoid timezone shifts
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-");
    return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
  }
  const dt = new Date(value);
  if (isNaN(dt.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", day: "numeric", month: "numeric", year: "numeric"
    }).formatToParts(dt);
    const get = (t) => Number(parts.find((p) => p.type === t).value);
    return `${get("day")} ${MONTHS[get("month") - 1]} ${get("year")}`;
  } catch {
    return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  }
}

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

/* ---------- Amount in words (Indian numbering: lakh / crore) ---------- */
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : "");
}

function threeDigits(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? `${ONES[h]} Hundred${r ? " " : ""}` : "") + (r ? twoDigits(r) : "");
}

function amountInWords(amount) {
  const totalPaise = Math.round(Math.abs(Number(amount) || 0) * 100);
  let rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;

  const crore = Math.floor(rupees / 10000000); rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000); rupees %= 100000;
  const thousand = Math.floor(rupees / 1000); rupees %= 1000;

  const parts = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rupees) parts.push(threeDigits(rupees));

  let words = `Rupees ${parts.length ? parts.join(" ") : "Zero"}`;
  if (paise) words += ` and ${twoDigits(paise)} Paise`;
  return `${words} Only`;
}

/* ------------------------------------------------------------------ */
/*  PDF                                                                */
/* ------------------------------------------------------------------ */

/**
 * Generates an invoice / quotation PDF entirely in memory.
 * Returns a Promise<Buffer> - nothing is written to disk.
 *
 * @param {object} invoice       Invoice record
 * @param {object} venue         Venue record
 * @param {object} client        Client record
 * @param {Buffer|null} upiQrBuffer  UPI QR code PNG buffer (from qr.generator)
 * @param {object|null} booking  Linked Booking record (optional - adds event details)
 */
async function generateInvoicePdf(invoice, venue, client, upiQrBuffer = null, booking = null) {
  // Verification QR - links to the public verify page, using invoice.id as the token
  const verifyUrl = `${FRONTEND_URL}/verify/${invoice.id}`;
  let verifyQrBuffer = null;
  try {
    verifyQrBuffer = await QRCode.toBuffer(verifyUrl, { width: 200, margin: 1 });
  } catch {
    verifyQrBuffer = null;
  }

  return new Promise((resolve, reject) => {
    const isInvoice = invoice.type !== "quotation";
    const DOC_LABELS = {
      quotation: "QUOTATION",
      proforma: "PROFORMA INVOICE",
      credit_note: "CREDIT NOTE",
      invoice: invoice.gst_enabled ? "TAX INVOICE" : "INVOICE"
    };
    const docLabel = DOC_LABELS[invoice.type] || "INVOICE";

    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: true,
      info: {
        Title: `${docLabel} ${invoice.invoice_number}`,
        Author: venue.hall_name || "In2Fest",
        Creator: "In2Fest"
      }
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const PAGE_W = doc.page.width;
      const PAGE_H = doc.page.height;
      const MX = 40;
      const CW = PAGE_W - MX * 2;
      const BOTTOM = PAGE_H - 64; // content must stay above the footer
      let y = 0;

      /* ---------- small drawing helpers ---------- */
      const setText = (font, size, color) => doc.font(font).fontSize(size).fillColor(color);
      const textH = (str, width, font, size) => {
        doc.font(font).fontSize(size);
        return doc.heightOfString(String(str), { width });
      };
      const hairline = (x1, y1, x2, color = C.line, w = 0.75) => {
        doc.moveTo(x1, y1).lineTo(x2, y1).lineWidth(w).strokeColor(color).stroke();
      };
      const topBar = () => doc.rect(0, 0, PAGE_W, 6).fill(C.brand);

      // Starts a new page when the next block would not fit
      const ensure = (h, redrawTable = false) => {
        if (y + h <= BOTTOM) return;
        doc.addPage();
        topBar();
        setText("Helvetica", 8.5, C.muted)
          .text(`${docLabel}  |  ${invoice.invoice_number}  (continued)`, MX, 22, { width: CW, lineBreak: false });
        y = 48;
        if (redrawTable) y = drawTableHeader(y);
      };

      const sectionTitle = (title) => {
        ensure(30);
        setText("Helvetica-Bold", 8, C.brand)
          .text(title, MX, y, { characterSpacing: 0.9, lineBreak: false });
        hairline(MX, y + 13, MX + CW);
        y += 22;
      };

      /* ============================================================ */
      /*  1. HEADER                                                    */
      /* ============================================================ */
      topBar();
      const headTop = 32;

      const venueName = venue.hall_name || "Venue";
      setText("Helvetica-Bold", 18, C.ink).text(venueName, MX, headTop, { width: 310 });
      let ly = headTop + textH(venueName, 310, "Helvetica-Bold", 18) + 5;

      const addr = [venue.address, venue.city].filter(Boolean);
      // avoid "Khargone, Khargone" when the address already contains the city
      const addressLine =
        venue.address && venue.city && String(venue.address).toLowerCase().includes(String(venue.city).toLowerCase())
          ? venue.address
          : addr.join(", ");

      const headLines = [];
      if (addressLine) headLines.push(addressLine);
      if (venue.phone) headLines.push(`Phone: ${venue.phone}`);
      if (invoice.gst_enabled && venue.gst_number) headLines.push(`GSTIN: ${venue.gst_number}`);

      headLines.forEach((line) => {
        setText("Helvetica", 9, C.muted).text(line, MX, ly, { width: 310 });
        ly += textH(line, 310, "Helvetica", 9) + 3;
      });

      // right side: document title + number
      const rightW = 210;
      const docTitleSize = docLabel.length > 12 ? 17 : 24;
      setText("Helvetica-Bold", docTitleSize, C.brand)
        .text(docLabel, MX + CW - rightW, headTop - 2 + (24 - docTitleSize) / 2, { width: rightW, align: "right", lineBreak: false });
      setText("Helvetica", 10, C.muted)
        .text(`No. ${invoice.invoice_number}`, MX + CW - rightW, headTop + 32, { width: rightW, align: "right", lineBreak: false });

      y = Math.max(ly, headTop + 52) + 10;
      hairline(MX, y, MX + CW);
      y += 14;

      /* ============================================================ */
      /*  2. KEY FACTS STRIP                                           */
      /* ============================================================ */
      const cells = [];
      cells.push({ label: "ISSUE DATE", value: fmtDate(invoice.created_at || invoice.createdAt || new Date()) });
      if (!isInvoice && invoice.validity_date) {
        cells.push({ label: "VALID UNTIL", value: fmtDate(invoice.validity_date) });
      }
      const evFrom = booking?.date_from || booking?.event_date;
      if (evFrom) {
        const evTo = booking?.date_to;
        cells.push({
          label: "EVENT DATE",
          value: evTo && evTo !== evFrom ? `${fmtDate(evFrom)} - ${fmtDate(evTo)}` : fmtDate(evFrom)
        });
        if (booking.start_time && booking.end_time) {
          cells.push({ label: "EVENT TIME", value: `${fmtTime(booking.start_time)} - ${fmtTime(booking.end_time)}` });
        }
      }
      if (isInvoice && invoice.due_date) cells.push({ label: "DUE DATE", value: fmtDate(invoice.due_date) });
      const hasPayments = Number(invoice.amount_paid) > 0;
      cells.push({
        label: !isInvoice ? "ESTIMATED TOTAL" : invoice.type === "credit_note" ? "CREDIT AMOUNT" : hasPayments ? "BALANCE DUE" : "AMOUNT PAYABLE",
        value: money(hasPayments ? invoice.balance_due : invoice.total),
        accent: true
      });

      const cellW = CW / cells.length;
      const valueH = Math.max(...cells.map((c) => textH(c.value, cellW - 20, "Helvetica-Bold", 9.5)));
      const stripH = 14 + 11 + valueH + 12;

      doc.roundedRect(MX, y, CW, stripH, 4).lineWidth(0.75).fillAndStroke(C.soft, C.line);
      cells.forEach((c, i) => {
        const cx = MX + i * cellW;
        if (i > 0) {
          doc.moveTo(cx, y + 10).lineTo(cx, y + stripH - 10).lineWidth(0.75).strokeColor(C.line).stroke();
        }
        setText("Helvetica-Bold", 7, C.muted)
          .text(c.label, cx + 12, y + 12, { width: cellW - 20, characterSpacing: 0.7, lineBreak: false });
        setText("Helvetica-Bold", 9.5, c.accent ? C.brand : C.ink)
          .text(c.value, cx + 12, y + 25, { width: cellW - 20 });
      });
      y += stripH + 14;

      /* ============================================================ */
      /*  3. BILL TO  |  BOOKING DETAILS                               */
      /* ============================================================ */
      const detailRows = [];
      if (booking?.id) detailRows.push(["Booking Ref", `BK-${String(booking.id).slice(0, 8).toUpperCase()}`]);
      const eventType = booking?.event_type || client?.event_type;
      const guests = booking?.guest_count || client?.guest_count;
      if (eventType) detailRows.push(["Event Type", String(eventType)]);
      if (guests) detailRows.push(["Expected Guests", String(guests)]);
      const profileFields = invoice.custom_fields && typeof invoice.custom_fields === "object" ? invoice.custom_fields : {};
      Object.entries(profileFields).forEach(([k, v]) => {
        if (v) detailRows.push([k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), String(v).slice(0, 40)]);
      });

      const hasDetails = detailRows.length > 0;
      const cardGap = 14;
      const cardW = hasDetails ? (CW - cardGap) / 2 : CW;
      const pad = 14;

      // Bill To content
      const clientName = client?.name || "Customer";
      const billLines = [];
      if (client?.address) billLines.push(String(client.address));
      if (client?.phone) billLines.push(`Phone: ${client.phone}`);
      if (client?.email) billLines.push(`Email: ${client.email}`);
      if (client?.gstin) billLines.push(`GSTIN: ${client.gstin}`);
      if (invoice.gst_enabled && invoice.place_of_supply) billLines.push(`Place of Supply: ${invoice.place_of_supply}`);

      let billH = 12 + 8 + 12 + textH(clientName, cardW - pad * 2, "Helvetica-Bold", 12) + 6;
      billLines.forEach((l) => { billH += textH(l, cardW - pad * 2, "Helvetica", 9) + 3; });
      billH += pad - 2;

      const detH = 12 + 8 + 12 + detailRows.length * 16 + pad - 4;
      const cardH = Math.max(billH, hasDetails ? detH : 0, 64);

      ensure(cardH + 20);

      // Bill To card
      doc.roundedRect(MX, y, cardW, cardH, 4).lineWidth(0.75).strokeColor(C.line).stroke();
      setText("Helvetica-Bold", 7.5, C.brand)
        .text("BILL TO", MX + pad, y + 12, { characterSpacing: 0.9, lineBreak: false });
      setText("Helvetica-Bold", 12, C.ink).text(clientName, MX + pad, y + 28, { width: cardW - pad * 2 });
      let by = y + 28 + textH(clientName, cardW - pad * 2, "Helvetica-Bold", 12) + 6;
      billLines.forEach((l) => {
        setText("Helvetica", 9, C.text).text(l, MX + pad, by, { width: cardW - pad * 2 });
        by += textH(l, cardW - pad * 2, "Helvetica", 9) + 3;
      });

      // Booking details card
      if (hasDetails) {
        const dx = MX + cardW + cardGap;
        doc.roundedRect(dx, y, cardW, cardH, 4).lineWidth(0.75).strokeColor(C.line).stroke();
        setText("Helvetica-Bold", 7.5, C.brand)
          .text("BOOKING DETAILS", dx + pad, y + 12, { characterSpacing: 0.9, lineBreak: false });
        let dy = y + 30;
        detailRows.forEach(([label, value]) => {
          setText("Helvetica", 9, C.muted).text(label, dx + pad, dy, { width: 95, lineBreak: false });
          setText("Helvetica-Bold", 9, C.ink).text(value, dx + pad + 95, dy, { width: cardW - pad * 2 - 95, lineBreak: false });
          dy += 16;
        });
      }
      y += cardH + 18;

      /* ============================================================ */
      /*  4. LINE ITEMS TABLE                                          */
      /* ============================================================ */
      const QTYW = 56;
      const col = {
        no: { x: MX, w: 26 },
        desc: { x: MX + 26, w: CW - (26 + QTYW + 88 + 78 + 95) },
        qty: { x: MX + CW - (QTYW + 88 + 78 + 95), w: QTYW },
        rate: { x: MX + CW - (88 + 78 + 95), w: 88 },
        disc: { x: MX + CW - (78 + 95), w: 78 },
        amt: { x: MX + CW - 95, w: 95 }
      };

      function drawTableHeader(top) {
        doc.rect(MX, top, CW, 24).fill(C.ink);
        const ty = top + 8;
        setText("Helvetica-Bold", 7.5, C.white);
        doc.text("#", col.no.x, ty, { width: col.no.w, align: "center", characterSpacing: 0.6, lineBreak: false });
        doc.text("DESCRIPTION", col.desc.x + 4, ty, { width: col.desc.w - 4, characterSpacing: 0.6, lineBreak: false });
        doc.text("QTY", col.qty.x, ty, { width: col.qty.w, align: "center", characterSpacing: 0.6, lineBreak: false });
        doc.text("RATE", col.rate.x, ty, { width: col.rate.w - 8, align: "right", characterSpacing: 0.6, lineBreak: false });
        doc.text("DISCOUNT", col.disc.x, ty, { width: col.disc.w - 8, align: "right", characterSpacing: 0.6, lineBreak: false });
        doc.text("AMOUNT", col.amt.x, ty, { width: col.amt.w - 10, align: "right", characterSpacing: 0.6, lineBreak: false });
        return top + 24;
      }

      ensure(24 + 40);
      y = drawTableHeader(y);

      const items = invoice.line_items || [];
      items.forEach((item, idx) => {
        const desc = [item.description || "-", item.hsn_sac ? `(${item.hsn_sac})` : ""].filter(Boolean).join(" ");
        const descH = textH(desc, col.desc.w - 8, "Helvetica-Bold", 9.5);
        const rowH = Math.max(descH, 12) + 18;

        ensure(rowH, true);

        const discountLabel =
          item.discount_type === "percentage" && Number(item.discount_value) > 0
            ? `${item.discount_value}%`
            : item.discount_type === "flat" && Number(item.discount_value) > 0
              ? money(item.discount_value)
              : "-";

        const ty = y + 9;
        setText("Helvetica", 9, C.muted).text(String(idx + 1), col.no.x, ty, { width: col.no.w, align: "center", lineBreak: false });
        setText("Helvetica-Bold", 9.5, C.ink).text(desc, col.desc.x + 4, ty, { width: col.desc.w - 8 });
        setText("Helvetica", 9.5, C.text).text(`${item.quantity}${item.unit ? " " + String(item.unit).slice(0, 4) : ""}`, col.qty.x, ty, { width: col.qty.w, align: "center", lineBreak: false });
        doc.text(money(item.rate), col.rate.x, ty, { width: col.rate.w - 8, align: "right", lineBreak: false });
        setText("Helvetica", 9.5, C.muted).text(discountLabel, col.disc.x, ty, { width: col.disc.w - 8, align: "right", lineBreak: false });
        setText("Helvetica-Bold", 9.5, C.ink).text(money(item.amount), col.amt.x, ty, { width: col.amt.w - 10, align: "right", lineBreak: false });

        y += rowH;
        hairline(MX, y, MX + CW);
      });

      y += 18;

      /* ============================================================ */
      /*  5. AMOUNT IN WORDS  |  TOTALS                                */
      /* ============================================================ */
      const totalsW = 236;
      const totalsX = MX + CW - totalsW;
      const wordsW = CW - totalsW - 22;

      const totalRows = [];
      totalRows.push({ label: "Subtotal", value: money(invoice.subtotal) });

      const hasDiscount = invoice.discount_type && invoice.discount_type !== "none" && Number(invoice.discount_amount) > 0;
      if (hasDiscount) {
        const dLabel = invoice.discount_type === "percentage" ? `Discount (${Number(invoice.discount_value)}%)` : "Discount";
        totalRows.push({ label: dLabel, value: `-${money(invoice.discount_amount)}`, muted: true });
      }

      if (invoice.gst_enabled) {
        totalRows.push({ label: invoice.price_includes_tax ? "Taxable Value (excl. tax)" : "Taxable Amount", value: money(invoice.taxable_amount) });
        const breakup = Array.isArray(invoice.tax_breakup) ? invoice.tax_breakup : [];
        if (breakup.length > 0) {
          breakup.forEach((g) => {
            if (invoice.supply_type === "inter" || Number(g.igst) > 0) {
              totalRows.push({ label: `IGST (${Number(g.rate)}%)`, value: money(g.igst), muted: true });
            } else {
              const half = Number(g.rate) / 2;
              totalRows.push({ label: `CGST (${half}%)`, value: money(g.cgst), muted: true });
              totalRows.push({ label: `SGST (${half}%)`, value: money(g.sgst), muted: true });
            }
          });
        } else {
          // documents created before tax_breakup existed
          const half = Number(invoice.gst_rate) / 2;
          totalRows.push({ label: `CGST (${half}%)`, value: money(invoice.cgst_amount), muted: true });
          totalRows.push({ label: `SGST (${half}%)`, value: money(invoice.sgst_amount), muted: true });
        }
      }

      if (Number(invoice.round_off) !== 0 && invoice.round_off !== null && invoice.round_off !== undefined) {
        const ro = Number(invoice.round_off);
        totalRows.push({ label: "Round Off", value: `${ro > 0 ? "+" : "-"}${money(Math.abs(ro))}`, muted: true });
      }

      const paidRows = [];
      if (isInvoice && invoice.type !== "credit_note" && Number(invoice.amount_paid) > 0) {
        paidRows.push({ label: "Amount Paid", value: `-${money(invoice.amount_paid)}`, muted: true });
        paidRows.push({ label: "Balance Due", value: money(invoice.balance_due), bold: true });
      }

      const totalsBlockH = totalRows.length * 19 + 10 + 36 + paidRows.length * 19;
      ensure(totalsBlockH + 10);

      // totals (right)
      let ty = y;
      totalRows.forEach((r) => {
        setText("Helvetica", 9.5, r.muted ? C.muted : C.text)
          .text(r.label, totalsX, ty, { width: totalsW - 120, lineBreak: false });
        setText("Helvetica", 9.5, r.muted ? C.muted : C.ink)
          .text(r.value, totalsX + totalsW - 120, ty, { width: 120, align: "right", lineBreak: false });
        ty += 19;
      });
      ty += 4;
      doc.roundedRect(totalsX, ty, totalsW, 34, 4).fill(C.brand);
      const grandLabel = !isInvoice ? "TOTAL ESTIMATE" : invoice.type === "credit_note" ? "CREDIT TOTAL" : "GRAND TOTAL";
      setText("Helvetica-Bold", 9, C.white)
        .text(grandLabel, totalsX + 14, ty + 12, { characterSpacing: 0.6, lineBreak: false });
      setText("Helvetica-Bold", 13, C.white)
        .text(money(invoice.total), totalsX + 100, ty + 10, { width: totalsW - 114, align: "right", lineBreak: false });

      let py = ty + 34 + 8;
      paidRows.forEach((r) => {
        setText(r.bold ? "Helvetica-Bold" : "Helvetica", 9.5, r.muted ? C.muted : C.ink)
          .text(r.label, totalsX, py, { width: totalsW - 120, lineBreak: false });
        setText(r.bold ? "Helvetica-Bold" : "Helvetica", 9.5, r.muted ? C.muted : C.ink)
          .text(r.value, totalsX + totalsW - 120, py, { width: 120, align: "right", lineBreak: false });
        py += 19;
      });
      const totalsBottom = paidRows.length ? py : ty + 34;

      // amount in words (left)
      const words = amountInWords(invoice.total);
      const wordsTextH = textH(words, wordsW - 24, "Helvetica-Bold", 9.5);
      const wordsH = 12 + 12 + wordsTextH + 14;
      doc.roundedRect(MX, y, wordsW, wordsH, 4).lineWidth(0.75).fillAndStroke(C.brandSoft, C.line);
      setText("Helvetica-Bold", 7.5, C.brand)
        .text("AMOUNT IN WORDS", MX + 12, y + 12, { characterSpacing: 0.9, lineBreak: false });
      setText("Helvetica-Bold", 9.5, C.ink).text(words, MX + 12, y + 27, { width: wordsW - 24 });

      y = Math.max(totalsBottom, y + wordsH) + 20;

      /* ============================================================ */
      /*  6. PAYMENT DETAILS                                           */
      /* ============================================================ */
      const bank = venue.bank_details || {};
      const bankRows = [
        bank.beneficiary_name && ["Account Name", bank.beneficiary_name],
        bank.account_number && ["Account Number", bank.account_number],
        bank.bank_name && ["Bank", bank.bank_name],
        bank.ifsc_code && ["IFSC Code", bank.ifsc_code],
        bank.branch_address && ["Branch", bank.branch_address]
      ].filter(Boolean);

      const hasBank = bankRows.length > 0;
      const hasQr = !!upiQrBuffer;

      if (hasBank || hasQr) {
        const qrColW = hasQr ? 124 : 0;
        const leftW = CW - qrColW;
        const labelW = 100;
        const padP = 14;

        const rowHeights = bankRows.map(([, v]) => Math.max(16, textH(v, leftW - padP * 2 - labelW, "Helvetica-Bold", 9) + 6));
        const leftH = hasBank ? 18 + rowHeights.reduce((a, b) => a + b, 0) : 0;
        const rightH = hasQr ? 76 + 30 : 0;
        const boxH = Math.max(leftH, rightH) + padP * 2;

        sectionTitle("PAYMENT DETAILS");
        ensure(boxH + 10);

        doc.roundedRect(MX, y, CW, boxH, 4).lineWidth(0.75).strokeColor(C.line).stroke();

        if (hasBank) {
          setText("Helvetica-Bold", 8.5, C.ink)
            .text("Bank Transfer (NEFT / IMPS / RTGS)", MX + padP, y + padP, { width: leftW - padP * 2, lineBreak: false });
          let ry = y + padP + 18;
          bankRows.forEach(([label, value], i) => {
            setText("Helvetica", 9, C.muted).text(label, MX + padP, ry, { width: labelW, lineBreak: false });
            setText("Helvetica-Bold", 9, C.ink).text(value, MX + padP + labelW, ry, { width: leftW - padP * 2 - labelW });
            ry += rowHeights[i];
          });
        }

        if (hasQr) {
          const qx = MX + leftW;
          if (hasBank) {
            doc.moveTo(qx, y + 12).lineTo(qx, y + boxH - 12).lineWidth(0.75).strokeColor(C.line).stroke();
          }
          doc.image(upiQrBuffer, qx + (qrColW - 76) / 2, y + padP, { width: 76 });
          setText("Helvetica-Bold", 8, C.ink)
            .text("Scan to pay via UPI", qx, y + padP + 82, { width: qrColW, align: "center", lineBreak: false });
          if (venue.upi_id) {
            setText("Helvetica", 7.5, C.muted)
              .text(venue.upi_id, qx + 4, y + padP + 94, { width: qrColW - 8, align: "center", lineBreak: false });
          }
        }

        y += boxH + 18;
      }

      /* ============================================================ */
      /*  7. TERMS  |  THANK YOU  |  VERIFICATION                      */
      /* ============================================================ */
      const termLines = String([invoice.terms, invoice.notes].filter(Boolean).join("\n"))
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l, i, arr) => (arr.length > 1 ? `${i + 1}.  ${l.replace(/^(\d+[.)]|[-*•])\s*/, "")}` : l));

      const thankYou = `Thank you for choosing ${venueName}.`;

      const VER_W = 176;
      const VER_H = 96;
      const leftW2 = CW - VER_W - 20;

      const termsBodyH = termLines.reduce((sum, t) => sum + textH(t, leftW2 - 6, "Helvetica", 8.5) + 4, 0);
      const termsH = termLines.length ? 22 + termsBodyH : 0;
      const thankH = textH(thankYou, leftW2, "Helvetica-Bold", 10);
      const leftBlockH = termsH + (termsH ? 12 : 0) + thankH;

      const drawVerifyCard = (vx, vy) => {
        doc.roundedRect(vx, vy, VER_W, VER_H, 4).lineWidth(0.75).fillAndStroke(C.soft, C.line);
        doc.image(verifyQrBuffer, vx + 12, vy + 12, { width: 54 });
        setText("Helvetica-Bold", 8.5, C.ink)
          .text("Verify this document", vx + 76, vy + 13, { width: VER_W - 86 });
        setText("Helvetica", 7, C.muted)
          .text(`Scan the QR code to confirm this ${isInvoice ? "invoice" : "quotation"} was issued by ${venueName}.`, vx + 76, vy + 36, { width: VER_W - 86 });
        setText("Helvetica", 6.5, C.brand)
          .text(verifyUrl, vx + 12, vy + 74, { width: VER_W - 24 });
      };

      if (leftBlockH <= 210) {
        // Compact layout: terms on the left, verification card on the right,
        // pinned to the bottom of the page so short invoices still look balanced.
        const rowH = Math.max(leftBlockH, verifyQrBuffer ? VER_H : 0);
        ensure(rowH + 4);
        const rowY = Math.max(y, BOTTOM - rowH);

        let cy = rowY;
        if (termLines.length) {
          setText("Helvetica-Bold", 8, C.brand)
            .text("TERMS & CONDITIONS", MX, cy, { characterSpacing: 0.9, lineBreak: false });
          hairline(MX, cy + 13, MX + leftW2);
          cy += 22;
          termLines.forEach((t) => {
            setText("Helvetica", 8.5, C.muted).text(t, MX + 2, cy, { width: leftW2 - 6 });
            cy += textH(t, leftW2 - 6, "Helvetica", 8.5) + 4;
          });
          cy += 12;
        }
        setText("Helvetica-Bold", 10, C.ink).text(thankYou, MX, cy, { width: leftW2 });

        if (verifyQrBuffer) drawVerifyCard(MX + CW - VER_W, rowY);
        y = rowY + rowH;
      } else {
        // Long terms: full-width flow that can span pages
        sectionTitle("TERMS & CONDITIONS");
        termLines.forEach((t) => {
          const h = textH(t, CW - 6, "Helvetica", 8.5);
          ensure(h + 4);
          setText("Helvetica", 8.5, C.muted).text(t, MX + 2, y, { width: CW - 6 });
          y += h + 4;
        });
        y += 12;

        ensure(30);
        setText("Helvetica-Bold", 10, C.ink).text(thankYou, MX, y, { width: CW, lineBreak: false });
        y += 24;

        if (verifyQrBuffer) {
          ensure(VER_H + 1);
          drawVerifyCard(MX + CW - VER_W, Math.max(y, BOTTOM - VER_H));
        }
      }

      /* ============================================================ */
      /*  9. FOOTER ON EVERY PAGE                                      */
      /* ============================================================ */
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const fy = PAGE_H - 46;
        hairline(MX, fy, MX + CW);
        setText("Helvetica", 7.5, C.muted);
        doc.text(`${venueName}  |  ${invoice.invoice_number}`, MX, fy + 9, { width: CW / 2, lineBreak: false });
        doc.text(`Page ${i + 1} of ${range.count}`, MX + CW / 2, fy + 9, { width: CW / 2, align: "right", lineBreak: false });
        doc.text("This is a computer-generated document and does not require a signature.", MX, fy + 21, {
          width: CW, align: "center", lineBreak: false
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePdf };