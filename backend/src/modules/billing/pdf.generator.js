const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const { loadLogo } = require("../gym/gym.brand");
const { PAL: C, put, putFit, para, paraH, hline, vline, drawWave, drawTopStrip, navyBar } = require("./pdf.theme");

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

  let logo = null;
  try {
    logo = await loadLogo(venue.logo_url);
  } catch {
    logo = null;
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
      const BOTTOM = PAGE_H - 58; // content must stay above the footer
      let y = 0;

      const venueName = venue.hall_name || "Business";
      const textH = (str, width, font, size) => paraH(doc, str, width, font, size, 0);

      // Continuation page: thin strip + small label
      const newPage = () => {
        doc.addPage();
        drawTopStrip(doc);
        put(doc, `${docLabel}  |  ${invoice.invoice_number}  (continued)`, MX, 22, { size: 8.5, color: C.muted });
        y = 46;
      };

      // Starts a new page when the next block would not fit
      const ensure = (h) => {
        if (y + h <= BOTTOM) return;
        newPage();
      };

      /* ============================================================ */
      /*  1. WAVE HEADER                                               */
      /* ============================================================ */
      const HEAD_H = 112;
      drawWave(doc, HEAD_H);

      let titleX = MX;
      if (logo) {
        try {
          doc.save().roundedRect(MX, 26, 60, 60, 10).fill("#ffffff").restore();
          doc.image(logo, MX + 5, 31, { fit: [50, 50], align: "center", valign: "center" });
          titleX = MX + 60 + 16;
        } catch {
          titleX = MX;
        }
      }
      const titleSize = docLabel.length > 12 ? 24 : 34;
      put(doc, docLabel, titleX, 26, { font: "Helvetica-Bold", size: titleSize, color: C.white, spacing: 1 });
      putFit(doc, venueName, titleX, 26 + titleSize + 8, 300, { font: "Helvetica", size: 11, minSize: 8, color: "#c7d8f7" });
      putFit(doc, `NO: ${invoice.invoice_number}`, MX + CW - 220, 38, 220, { font: "Helvetica-Bold", size: 13, minSize: 8, color: C.white, align: "right" });

      y = HEAD_H + 20;

      /* ============================================================ */
      /*  2. BILL TO  |  FROM                                          */
      /* ============================================================ */
      const colW = (CW - 30) / 2;
      const rightX = MX + CW - colW;

      // Bill To (left)
      const clientName = client?.name || "Customer";
      const billLines = [];
      if (client?.phone) billLines.push(String(client.phone));
      if (client?.email) billLines.push(String(client.email));
      if (client?.address) billLines.push(String(client.address));
      if (client?.gstin) billLines.push(`GSTIN: ${client.gstin}`);
      if (invoice.gst_enabled && invoice.place_of_supply) billLines.push(`Place of Supply: ${invoice.place_of_supply}`);

      put(doc, "Bill To:", MX, y, { font: "Helvetica-Bold", size: 15, color: C.ink });
      let ly = y + 24;
      ly += para(doc, clientName, MX, ly, colW, { font: "Helvetica-Bold", size: 11, color: C.ink, lineGap: 1 }) + 4;
      billLines.forEach((l) => {
        ly += para(doc, l, MX, ly, colW, { size: 10, color: C.text, lineGap: 1 }) + 3;
      });

      // From (right)
      const addr = [venue.address, venue.city].filter(Boolean);
      const addressLine =
        venue.address && venue.city && String(venue.address).toLowerCase().includes(String(venue.city).toLowerCase())
          ? venue.address
          : addr.join(", ");
      const fromLines = [];
      if (venue.phone) fromLines.push(String(venue.phone));
      if (venue.email) fromLines.push(String(venue.email));
      if (addressLine) fromLines.push(String(addressLine));
      if (invoice.gst_enabled && venue.gst_number) fromLines.push(`GSTIN: ${venue.gst_number}`);

      put(doc, "From:", rightX, y, { font: "Helvetica-Bold", size: 15, color: C.ink, width: colW, align: "right" });
      let ry = y + 24;
      ry += para(doc, venueName, rightX, ry, colW, { font: "Helvetica-Bold", size: 11, color: C.ink, align: "right", lineGap: 1 }) + 4;
      fromLines.forEach((l) => {
        ry += para(doc, l, rightX, ry, colW, { size: 10, color: C.text, align: "right", lineGap: 1 }) + 3;
      });

      y = Math.max(ly, ry) + 14;

      /* ============================================================ */
      /*  3. DATES + EVENT / PROFILE DETAILS                           */
      /* ============================================================ */
      const meta = [];
      meta.push(["Date", fmtDate(invoice.created_at || invoice.createdAt || new Date())]);
      if (!isInvoice && invoice.validity_date) meta.push(["Valid Until", fmtDate(invoice.validity_date)]);
      if (isInvoice && invoice.due_date) meta.push(["Due Date", fmtDate(invoice.due_date)]);
      const evFrom = booking?.date_from || booking?.event_date;
      if (evFrom) {
        const evTo = booking?.date_to;
        meta.push(["Event Date", evTo && evTo !== evFrom ? `${fmtDate(evFrom)} - ${fmtDate(evTo)}` : fmtDate(evFrom)]);
        if (booking.start_time && booking.end_time) {
          meta.push(["Event Time", `${fmtTime(booking.start_time)} - ${fmtTime(booking.end_time)}`]);
        }
      }
      if (booking?.id) meta.push(["Booking Ref", `BK-${String(booking.id).slice(0, 8).toUpperCase()}`]);
      const eventType = booking?.event_type || client?.event_type;
      const guests = booking?.guest_count || client?.guest_count;
      if (eventType) meta.push(["Event Type", String(eventType)]);
      if (guests) meta.push(["Guests", String(guests)]);
      const profileFields = invoice.custom_fields && typeof invoice.custom_fields === "object" ? invoice.custom_fields : {};
      Object.entries(profileFields).forEach(([k, v]) => {
        if (v) meta.push([k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), String(v).slice(0, 40)]);
      });

      const metaRows = Math.ceil(meta.length / 2);
      ensure(metaRows * 18 + 20);
      meta.forEach(([label, value], i) => {
        const cx = MX + (i % 2) * (CW / 2);
        const cy = y + Math.floor(i / 2) * 18;
        const lw = (() => {
          doc.font("Helvetica-Bold").fontSize(10);
          return doc.widthOfString(`${label}: `);
        })();
        put(doc, `${label}:`, cx, cy, { font: "Helvetica-Bold", size: 10, color: C.ink });
        putFit(doc, value, cx + lw, cy, CW / 2 - lw - 10, { font: "Helvetica", size: 10, minSize: 7, color: C.text });
      });
      y += metaRows * 18 + 14;

      /* ============================================================ */
      /*  4. LINE ITEMS TABLE (bordered grid)                          */
      /* ============================================================ */
      const items = invoice.line_items || [];
      const hasItemDiscount = items.some(
        (it) => (it.discount_type === "percentage" || it.discount_type === "flat") && Number(it.discount_value) > 0
      );
      const W_QTY = 52;
      const W_PRICE = 92;
      const W_DISC = hasItemDiscount ? 76 : 0;
      const W_TOTAL = 100;
      const W_DESC = CW - (W_QTY + W_PRICE + W_DISC + W_TOTAL);
      const colX = {
        desc: MX,
        qty: MX + W_DESC,
        price: MX + W_DESC + W_QTY,
        disc: MX + W_DESC + W_QTY + W_PRICE,
        total: MX + W_DESC + W_QTY + W_PRICE + W_DISC
      };
      const gridX = [colX.qty, colX.price, hasItemDiscount ? colX.disc : null, colX.total].filter((v) => v !== null);

      function drawTableHeader(top) {
        const TH = 28;
        doc.rect(MX, top, CW, TH).fill(C.navy);
        const ty = top + 10;
        const hdr = { font: "Helvetica-Bold", size: 9.5, color: C.white };
        put(doc, "Description", colX.desc, ty, { ...hdr, width: W_DESC, align: "center" });
        put(doc, "Qty", colX.qty, ty, { ...hdr, width: W_QTY, align: "center" });
        put(doc, "Price", colX.price, ty, { ...hdr, width: W_PRICE, align: "center" });
        if (hasItemDiscount) put(doc, "Discount", colX.disc, ty, { ...hdr, width: W_DISC, align: "center" });
        put(doc, "Total", colX.total, ty, { ...hdr, width: W_TOTAL, align: "center" });
        // thin separators in the header
        gridX.forEach((gx) => vline(doc, gx, top + 5, top + TH - 5, "#6f8fcf", 0.6));
        return top + TH;
      }

      ensure(28 + 40);
      let segTop = y; // top of the current page's table segment (for borders)
      y = drawTableHeader(y);

      // outer border + vertical grid lines for the rows drawn on this page
      const closeSegment = () => {
        doc.rect(MX, segTop, CW, y - segTop).lineWidth(0.8).strokeColor(C.grid).stroke();
        gridX.forEach((gx) => vline(doc, gx, segTop + 28, y, C.grid, 0.6));
      };

      items.forEach((item) => {
        const descText = [item.description || "-", item.hsn_sac ? `(HSN/SAC ${item.hsn_sac})` : ""].filter(Boolean).join(" ");
        const descH = textH(descText, W_DESC - 16, "Helvetica", 10);
        const rowH = Math.max(descH + 12, 24);

        if (y + rowH > BOTTOM) {
          closeSegment();
          newPage();
          segTop = y;
          y = drawTableHeader(y);
        }

        const discountLabel =
          item.discount_type === "percentage" && Number(item.discount_value) > 0
            ? `${item.discount_value}%`
            : item.discount_type === "flat" && Number(item.discount_value) > 0
              ? money(item.discount_value)
              : "-";

        const ty = y + 7;
        para(doc, descText, colX.desc + 8, ty, W_DESC - 16, { size: 10, color: C.ink, lineGap: 0 });
        put(doc, `${item.quantity}${item.unit ? " " + String(item.unit).slice(0, 4) : ""}`, colX.qty, ty, { size: 10, color: C.text, width: W_QTY, align: "center" });
        put(doc, money(item.rate), colX.price, ty, { size: 10, color: C.text, width: W_PRICE - 8, align: "right" });
        if (hasItemDiscount) put(doc, discountLabel, colX.disc, ty, { size: 10, color: C.muted, width: W_DISC - 8, align: "right" });
        put(doc, money(item.amount), colX.total, ty, { font: "Helvetica-Bold", size: 10, color: C.ink, width: W_TOTAL - 8, align: "right" });

        y += rowH;
        hline(doc, MX, MX + CW, y, C.line, 0.6);
      });
      closeSegment();
      y += 16;

      /* ============================================================ */
      /*  5. TOTALS (right)  |  AMOUNT IN WORDS (left)                 */
      /* ============================================================ */
      const totalsW = 250;
      const totalsX = MX + CW - totalsW;
      const wordsW = CW - totalsW - 24;

      const totalRows = [];
      totalRows.push({ label: "Sub Total", value: money(invoice.subtotal) });

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

      const showPaid = isInvoice && invoice.type !== "credit_note" && Number(invoice.amount_paid) > 0;
      const totalsBlockH = totalRows.length * 18 + 6 + 32 + (showPaid ? 8 + 18 + 32 : 0);

      const words = amountInWords(invoice.total);
      const wordsTextH = textH(words, wordsW - 28, "Helvetica-Bold", 10);
      const wordsH = 14 + 14 + wordsTextH + 14;

      const termLines = String([invoice.terms, invoice.notes].filter(Boolean).join("\n"))
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l, i, arr) => (arr.length > 1 ? `${i + 1}.  ${l.replace(/^(\d+[.)]|[-*•])\s*/, "")}` : l));
      const notesBodyH = termLines.reduce((sum, t) => sum + textH(t, wordsW - 6, "Helvetica", 8.5) + 3, 0);
      const notesInline = termLines.length > 0 && notesBodyH <= 110; // short notes sit under the words box
      const leftH = wordsH + (notesInline ? 14 + 20 + notesBodyH : 0);
      ensure(Math.max(totalsBlockH, leftH) + 10);

      let ty = y;
      totalRows.forEach((r) => {
        put(doc, r.label, totalsX + 14, ty, { size: 10, color: r.muted ? C.muted : C.text });
        put(doc, r.value, totalsX + 100, ty, { size: 10, color: r.muted ? C.muted : C.ink, width: totalsW - 114, align: "right" });
        ty += 18;
      });
      ty += 4;
      const grandLabel = !isInvoice ? "Total Estimate" : invoice.type === "credit_note" ? "Credit Total" : "Grand Total";
      navyBar(doc, totalsX, ty, totalsW, 32, grandLabel, money(invoice.total), { size: 11.5 });
      ty += 32;

      if (showPaid) {
        ty += 8;
        put(doc, "Amount Paid", totalsX + 14, ty, { size: 10, color: C.muted });
        put(doc, `-${money(invoice.amount_paid)}`, totalsX + 100, ty, { size: 10, color: C.muted, width: totalsW - 114, align: "right" });
        ty += 18;
        doc.rect(totalsX, ty, totalsW, 32).lineWidth(1.2).fillAndStroke(C.navySoft, C.navy);
        put(doc, "Balance Due", totalsX + 14, ty + 11, { font: "Helvetica-Bold", size: 11.5, color: C.navy });
        put(doc, money(invoice.balance_due), totalsX + 110, ty + 11, { font: "Helvetica-Bold", size: 11.5, color: C.navy, width: totalsW - 124, align: "right" });
        ty += 32;
      }

      // amount in words (left)
      doc.rect(MX, y, wordsW, wordsH).fill(C.soft);
      doc.rect(MX, y, 4, wordsH).fill(C.navy);
      put(doc, "AMOUNT IN WORDS", MX + 16, y + 13, { font: "Helvetica-Bold", size: 7.5, color: C.navy, spacing: 0.9 });
      para(doc, words, MX + 16, y + 28, wordsW - 28, { font: "Helvetica-Bold", size: 10, color: C.ink, lineGap: 0 });

      let leftBottom = y + wordsH;
      if (notesInline) {
        let ny = y + wordsH + 14;
        put(doc, "Note:", MX, ny, { font: "Helvetica-Bold", size: 11, color: C.ink });
        hline(doc, MX + 40, MX + wordsW, ny + 12, C.line, 0.6);
        ny += 20;
        termLines.forEach((t) => {
          const h = textH(t, wordsW - 6, "Helvetica", 8.5);
          para(doc, t, MX + 2, ny, wordsW - 6, { size: 8.5, color: C.muted, lineGap: 0 });
          ny += h + 3;
        });
        leftBottom = ny;
      }

      y = Math.max(ty, leftBottom) + 18;

      /* ============================================================ */
      /*  6. NOTES / TERMS (long notes only, full width)               */
      /* ============================================================ */
      if (termLines.length && !notesInline) {
        ensure(40);
        put(doc, "Note:", MX, y, { font: "Helvetica-Bold", size: 11, color: C.ink });
        hline(doc, MX + 40, MX + CW, y + 12, C.line, 0.6);
        y += 20;
        termLines.forEach((t) => {
          const h = textH(t, CW - 6, "Helvetica", 9);
          ensure(h + 4);
          para(doc, t, MX + 2, y, CW - 6, { size: 9, color: C.muted, lineGap: 0 });
          y += h + 4;
        });
        y += 10;
      }

      /* ============================================================ */
      /*  7. PAYMENT INFORMATION | UPI QR | VERIFY QR + THANK YOU      */
      /* ============================================================ */
      const bank = venue.bank_details || {};
      const bankRows = [
        bank.bank_name && ["Bank", bank.bank_name],
        bank.beneficiary_name && ["Account Name", bank.beneficiary_name],
        bank.account_number && ["Account No", bank.account_number],
        bank.ifsc_code && ["IFSC Code", bank.ifsc_code],
        bank.branch_address && ["Branch", bank.branch_address]
      ].filter(Boolean);

      const hasBank = bankRows.length > 0;
      const hasUpi = !!upiQrBuffer;
      const bankW = hasBank ? (hasUpi ? 250 : 300) : 0;
      const upiW = hasUpi ? 110 : 0;
      const labelW = 82;
      const rowHeights = bankRows.map(([, v]) => Math.max(15, textH(v, bankW - labelW - 6, "Helvetica", 9.5) + 4));
      const bankH = hasBank ? 22 + rowHeights.reduce((a, b2) => a + b2, 0) : 0;
      const blockH = Math.max(bankH, hasUpi ? 108 : 0, verifyQrBuffer ? 84 : 0, 64);

      ensure(blockH + 4);
      const blockY = Math.max(y, BOTTOM - blockH);

      if (hasBank) {
        put(doc, "Payment Information:", MX, blockY, { font: "Helvetica-Bold", size: 12, color: C.ink });
        let by = blockY + 22;
        bankRows.forEach(([label, value], i) => {
          put(doc, `${label}:`, MX, by, { font: "Helvetica-Bold", size: 9.5, color: C.ink });
          para(doc, value, MX + labelW, by, bankW - labelW - 6, { size: 9.5, color: C.text, lineGap: 0 });
          by += rowHeights[i];
        });
      }

      if (hasUpi) {
        const ux = MX + bankW + (hasBank ? 10 : 0);
        doc.image(upiQrBuffer, ux + (upiW - 76) / 2, blockY, { width: 76 });
        put(doc, "Scan to pay via UPI", ux, blockY + 82, { font: "Helvetica-Bold", size: 8, color: C.ink, width: upiW, align: "center" });
        if (venue.upi_id) putFit(doc, venue.upi_id, ux, blockY + 94, upiW, { size: 7.5, minSize: 6, color: C.muted, align: "center" });
      }

      const rx = MX + bankW + upiW + 20;
      const rw = MX + CW - rx;
      if (verifyQrBuffer) {
        doc.image(verifyQrBuffer, MX + CW - 46, blockY, { width: 46 });
        put(doc, "Verify this document", rx, blockY + 4, { font: "Helvetica-Bold", size: 8, color: C.ink, width: rw - 54, align: "right" });
        para(doc, "Scan the QR to confirm it was issued by us.", rx, blockY + 16, rw - 54, { size: 7, color: C.muted, align: "right", lineGap: 1 });
      }
      put(doc, "Thank You!", rx, blockY + blockH - 34, { size: 26, color: C.ink, width: rw, align: "right" });
      y = blockY + blockH;

      /* ============================================================ */
      /*  8. FOOTER ON EVERY PAGE                                      */
      /* ============================================================ */
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const fy = PAGE_H - 42;
        hline(doc, MX, MX + CW, fy, C.line, 0.75);
        put(doc, `${venueName}  |  ${invoice.invoice_number}`, MX, fy + 9, { size: 7.5, color: C.muted });
        put(doc, `Page ${i + 1} of ${range.count}`, MX, fy + 9, { size: 7.5, color: C.muted, width: CW, align: "right" });
        put(doc, "This is a computer-generated document and does not require a signature.", MX, fy + 21, { size: 7.5, color: C.muted, width: CW, align: "center" });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePdf };