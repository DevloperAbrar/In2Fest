const { Invoice, Client, Venue } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const billingService = require("./billing.service");

async function getQuotations(req, res, next) {
  try {
    const quotations = await Invoice.findAll({
      where: { venue_id: req.params.venueId, type: "quotation" },
      include: [{ model: Client, as: "client" }],
      order: [["created_at", "DESC"]]
    });
    res.json({ success: true, data: quotations.map(billingService.toApi) });
  } catch (error) {
    next(error);
  }
}

// Converts a quotation (or proforma) into a real invoice with identical items, tax and discount,
// generates its PDF, and links the two so it can't be converted twice.
async function convertQuotationToInvoice(req, res, next) {
  try {
    const venue = await Venue.findByPk(req.params.venueId);
    if (!venue) throw new AppError("Venue not found", 404);

    const source = await Invoice.findOne({
      where: { id: req.params.quotationId, venue_id: venue.id }
    });
    if (!source || !["quotation", "proforma"].includes(source.type)) {
      throw new AppError("Quotation not found", 404);
    }
    if (source.converted_to) {
      throw new AppError("This quotation has already been converted to an invoice.", 409);
    }

    const body = {
      type: "invoice",
      client_id: source.client_id,
      customer: source.customer_snapshot,
      booking_id: source.booking_id,
      line_items: source.line_items,
      gst_enabled: source.gst_enabled,
      gst_rate: Number(source.gst_rate) > 0 ? Number(source.gst_rate) : undefined,
      price_includes_tax: source.price_includes_tax,
      discount_type: source.discount_type,
      discount_value: source.discount_value,
      place_of_supply: source.place_of_supply,
      terms: source.terms,
      notes: source.notes,
      custom_fields: source.custom_fields,
      due_date: req.body?.due_date
    };

    const invoice = await billingService.createDocument(venue, body, {
      afterCreate: async (created, transaction) => {
        source.converted_to = created.id;
        await source.save({ transaction });
      }
    });

    const full = await Invoice.findByPk(invoice.id, { include: [{ model: Client, as: "client" }] });
    res.status(201).json({ success: true, data: billingService.toApi(full) });
  } catch (error) {
    next(error);
  }
}

module.exports = { getQuotations, convertQuotationToInvoice };