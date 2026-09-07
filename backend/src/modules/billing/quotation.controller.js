// Quotations reuse the exact same creation logic as invoices (type: "quotation"),
// since your spec defines them as the same structure minus the "Tax Invoice" marking.
// This controller exposes quotation-specific read endpoints; creation goes through
// invoice.controller.js's createInvoice with { type: "quotation" } in the body.

const { Invoice, Client } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

async function getQuotations(req, res, next) {
  try {
    const quotations = await Invoice.findAll({
      where: { venue_id: req.params.venueId, type: "quotation" },
      include: [{ model: Client, as: "client" }],
      order: [["created_at", "DESC"]]
    });
    res.json({ success: true, data: quotations });
  } catch (error) {
    next(error);
  }
}

async function convertQuotationToInvoice(req, res, next) {
  try {
    const quotation = await Invoice.findOne({
      where: { id: req.params.quotationId, venue_id: req.params.venueId, type: "quotation" }
    });
    if (!quotation) throw new AppError("Quotation not found", 404);

    const { generateInvoiceNumber } = require("../../utils/invoiceNumberGenerator");
    const { Venue } = require("../../database/models");
    const venue = await Venue.findByPk(req.params.venueId);

    const invoiceNumber = await generateInvoiceNumber(venue.id, venue.hall_name, "invoice");

    const invoice = await Invoice.create({
      venue_id: quotation.venue_id,
      booking_id: quotation.booking_id,
      client_id: quotation.client_id,
      type: "invoice",
      invoice_number: invoiceNumber,
      line_items: quotation.line_items,
      subtotal: quotation.subtotal,
      gst_enabled: venue.gst_enabled,
      cgst_amount: quotation.cgst_amount,
      sgst_amount: quotation.sgst_amount,
      total: quotation.total,
      terms: quotation.terms,
      qr_code_url: quotation.qr_code_url,
      status: "draft"
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

module.exports = { getQuotations, convertQuotationToInvoice };