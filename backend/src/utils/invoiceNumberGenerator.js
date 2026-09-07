const dayjs = require("dayjs");
const { Invoice } = require("../database/models");
const { Op } = require("sequelize");

/**
 * Generates a sequential invoice number per venue, per financial year.
 * Format: INV-{venueShortCode}-{FY}-{sequence}  e.g. INV-GRD-2526-0001
 */
async function generateInvoiceNumber(venueId, venueName, type = "invoice") {
  const now = dayjs();
  const fyStartYear = now.month() >= 3 ? now.year() : now.year() - 1;
  const fy = `${String(fyStartYear).slice(-2)}${String(fyStartYear + 1).slice(-2)}`;

  const prefix = type === "quotation" ? "QUO" : "INV";
  const venueCode = (venueName || "VEN").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();

  const count = await Invoice.count({
    where: {
      venue_id: venueId,
      type,
      created_at: {
        [Op.gte]: dayjs(`${fyStartYear}-04-01`).toDate()
      }
    }
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `${prefix}-${venueCode}-${fy}-${sequence}`;
}

module.exports = { generateInvoiceNumber };