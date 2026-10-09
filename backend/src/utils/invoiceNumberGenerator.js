const dayjs = require("dayjs");
const { QueryTypes } = require("sequelize");
const { getSequelize } = require("./db");

const PREFIX = { quotation: "QUO", invoice: "INV", proforma: "PRO", credit_note: "CN" };

/**
 * Atomic, gap-free sequential number per venue + document type + Indian financial year.
 * Format: INV-{venueCode}-{FY}-{seq}  e.g. INV-GRD-2526-0001
 * Pass the same `transaction` used to create the document so a failed create rolls the counter back.
 */
async function generateInvoiceNumber(venueId, venueName, type = "invoice", transaction = null) {
  const sequelize = getSequelize();

  const now = dayjs();
  const fyStartYear = now.month() >= 3 ? now.year() : now.year() - 1;
  const fy = `${String(fyStartYear).slice(-2)}${String(fyStartYear + 1).slice(-2)}`;

  const prefix = PREFIX[type] || "DOC";
  const venueCode = (venueName || "VEN").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "VEN";

  // First use of a counter continues after any numbers that already exist this FY.
  const seedRows = await sequelize.query(
    `SELECT COALESCE(MAX(CAST(substring(invoice_number from '([0-9]+)$') AS INTEGER)), 0) AS max_seq
       FROM invoices
      WHERE venue_id = :venueId AND invoice_number LIKE :pattern`,
    { replacements: { venueId, pattern: `${prefix}-%-${fy}-%` }, type: QueryTypes.SELECT, transaction }
  );
  const seed = Number(seedRows?.[0]?.max_seq || 0);

  const rows = await sequelize.query(
    `INSERT INTO invoice_counters (venue_id, doc_type, fy, last_value)
          VALUES (:venueId, :type, :fy, :first)
     ON CONFLICT (venue_id, doc_type, fy)
     DO UPDATE SET last_value = invoice_counters.last_value + 1
       RETURNING last_value`,
    { replacements: { venueId, type, fy, first: seed + 1 }, type: QueryTypes.SELECT, transaction }
  );

  const seq = Number(rows?.[0]?.last_value || seed + 1);
  return `${prefix}-${venueCode}-${fy}-${String(seq).padStart(4, "0")}`;
}

module.exports = { generateInvoiceNumber };