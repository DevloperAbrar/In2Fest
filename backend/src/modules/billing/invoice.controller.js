const { Invoice, Venue, Client, ServiceItem } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { generateInvoiceNumber } = require("../../utils/invoiceNumberGenerator");
const { generateUpiQr } = require("./qr.generator");
const { generateInvoicePdf } = require("./pdf.generator");
const { sendWhatsApp } = require("../whatsapp/whatsapp.service");

const DEFAULT_GST_RATE = 18;

function calculateLineItemAmount(item) {
  const quantity = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const base = quantity * rate;

  const discountType = item.discount_type || "none";
  const discountValue = Number(item.discount_value) || 0;

  let lineDiscount = 0;
  if (discountType === "percentage") lineDiscount = base * (discountValue / 100);
  else if (discountType === "flat") lineDiscount = discountValue;

  lineDiscount = Math.min(Math.max(lineDiscount, 0), base);

  return {
    ...item,
    quantity,
    rate,
    discount_type: discountType,
    discount_value: discountValue,
    line_discount_amount: +lineDiscount.toFixed(2),
    amount: +(base - lineDiscount).toFixed(2)
  };
}

function calculateTotals(rawLineItems, { gstEnabled, gstRate, discountType, discountValue }) {
  const lineItems = (rawLineItems || []).map(calculateLineItemAmount);

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const overallDiscountType = discountType || "none";
  const overallDiscountValue = Number(discountValue) || 0;

  let discountAmount = 0;
  if (overallDiscountType === "percentage") discountAmount = subtotal * (overallDiscountValue / 100);
  else if (overallDiscountType === "flat") discountAmount = overallDiscountValue;

  discountAmount = Math.min(Math.max(discountAmount, 0), subtotal);

  const taxableAmount = +(subtotal - discountAmount).toFixed(2);

  const effectiveGstRate = gstEnabled ? Math.min(Math.max(Number(gstRate) || DEFAULT_GST_RATE, 0), 100) : 0;
  const halfRate = effectiveGstRate / 2;

  let cgst = 0, sgst = 0;
  if (gstEnabled) {
    cgst = +(taxableAmount * (halfRate / 100)).toFixed(2);
    sgst = +(taxableAmount * (halfRate / 100)).toFixed(2);
  }

  const total = +(taxableAmount + cgst + sgst).toFixed(2);

  return {
    lineItems,
    subtotal: +subtotal.toFixed(2),
    discountType: overallDiscountType,
    discountValue: overallDiscountValue,
    discountAmount: +discountAmount.toFixed(2),
    taxableAmount,
    gstRate: effectiveGstRate,
    cgst,
    sgst,
    total
  };
}

async function createInvoice(req, res, next) {
  try {
    const venue = await Venue.findByPk(req.params.venueId);
    if (!venue) throw new AppError("Venue not found", 404);

    const client = await Client.findOne({ where: { id: req.body.client_id, venue_id: venue.id } });
    if (!client) throw new AppError("Client not found", 404);

    const type = req.body.type === "quotation" ? "quotation" : "invoice";
    const gstEnabled = type === "invoice" && Boolean(req.body.gst_enabled ?? venue.gst_enabled);

    if (gstEnabled && !venue.gst_number) {
      throw new AppError("GST is enabled for this invoice, but no GSTIN is set for this venue. Add a GSTIN in Settings first.", 400);
    }

    const {
      lineItems, subtotal, discountType, discountValue, discountAmount, taxableAmount, gstRate, cgst, sgst, total
    } = calculateTotals(req.body.line_items, {
      gstEnabled,
      gstRate: req.body.gst_rate,
      discountType: req.body.discount_type,
      discountValue: req.body.discount_value
    });

    const invoiceNumber = await generateInvoiceNumber(venue.id, venue.hall_name, type);

    let qrCodeUrl = null;
    if (venue.upi_id) {
      qrCodeUrl = await generateUpiQr(venue.upi_id, venue.hall_name, total, invoiceNumber);
    }

    const invoice = await Invoice.create({
      venue_id: venue.id,
      booking_id: req.body.booking_id || null,
      client_id: client.id,
      type,
      invoice_number: invoiceNumber,
      line_items: lineItems,
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: discountAmount,
      taxable_amount: taxableAmount,
      gst_enabled: gstEnabled,
      gst_rate: gstRate,
      cgst_amount: cgst,
      sgst_amount: sgst,
      total,
      validity_date: req.body.validity_date,
      terms: req.body.terms,
      qr_code_url: qrCodeUrl,
      status: "draft"
    });

    const pdfUrl = await generateInvoicePdf(invoice, venue, client);
    invoice.pdf_url = pdfUrl;
    await invoice.save();

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

async function updateInvoice(req, res, next) {
  try {
    const venue = await Venue.findByPk(req.params.venueId);
    if (!venue) throw new AppError("Venue not found", 404);

    const invoice = await Invoice.findOne({ where: { id: req.params.invoiceId, venue_id: venue.id } });
    if (!invoice) throw new AppError("Invoice not found", 404);

    if (invoice.status !== "draft") {
      throw new AppError("Only draft invoices can be edited. This invoice has already been shared.", 400);
    }

    let clientId = invoice.client_id;
    if (req.body.client_id) {
      const clientCheck = await Client.findOne({ where: { id: req.body.client_id, venue_id: venue.id } });
      if (!clientCheck) throw new AppError("Client not found", 404);
      clientId = clientCheck.id;
    }

    const gstEnabled = Boolean(req.body.gst_enabled ?? invoice.gst_enabled);

    if (gstEnabled && !venue.gst_number) {
      throw new AppError("GST is enabled for this invoice, but no GSTIN is set for this venue. Add a GSTIN in Settings first.", 400);
    }

    const {
      lineItems, subtotal, discountType, discountValue, discountAmount, taxableAmount, gstRate, cgst, sgst, total
    } = calculateTotals(req.body.line_items, {
      gstEnabled,
      gstRate: req.body.gst_rate,
      discountType: req.body.discount_type,
      discountValue: req.body.discount_value
    });

    invoice.client_id = clientId;
    invoice.line_items = lineItems;
    invoice.subtotal = subtotal;
    invoice.discount_type = discountType;
    invoice.discount_value = discountValue;
    invoice.discount_amount = discountAmount;
    invoice.taxable_amount = taxableAmount;
    invoice.gst_enabled = gstEnabled;
    invoice.gst_rate = gstRate;
    invoice.cgst_amount = cgst;
    invoice.sgst_amount = sgst;
    invoice.total = total;

    if (venue.upi_id) {
      invoice.qr_code_url = await generateUpiQr(venue.upi_id, venue.hall_name, total, invoice.invoice_number);
    }

    const client = await Client.findByPk(clientId);

    const pdfUrl = await generateInvoicePdf(invoice, venue, client);
    invoice.pdf_url = pdfUrl;

    await invoice.save();

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

async function deleteInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.invoiceId, venue_id: req.params.venueId } });
    if (!invoice) throw new AppError("Invoice not found", 404);

    if (invoice.status !== "draft") {
      throw new AppError("Only draft invoices can be deleted. This invoice has already been shared.", 400);
    }

    await invoice.destroy();

    res.json({ success: true, message: "Invoice deleted" });
  } catch (error) {
    next(error);
  }
}

async function shareViaWhatsapp(req, res, next) {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.invoiceId, venue_id: req.params.venueId },
      include: [{ model: Client, as: "client" }]
    });
    if (!invoice) throw new AppError("Invoice not found", 404);

    await sendWhatsApp({
      venueId: req.params.venueId,
      recipientPhone: invoice.client.phone,
      triggerType: "invoice_shared",
      variables: {
        customerName: invoice.client.name,
        invoiceNumber: invoice.invoice_number,
        pdfLink: invoice.pdf_url
      }
    });

    invoice.status = "sent";
    await invoice.save();

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

async function getInvoices(req, res, next) {
  try {
    const invoices = await Invoice.findAll({
      where: { venue_id: req.params.venueId },
      include: [{ model: Client, as: "client" }],
      order: [["created_at", "DESC"]]
    });
    res.json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
}

async function getInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.invoiceId, venue_id: req.params.venueId },
      include: [{ model: Client, as: "client" }]
    });
    if (!invoice) throw new AppError("Invoice not found", 404);
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createInvoice,
  updateInvoice,
  deleteInvoice,
  shareViaWhatsapp,
  getInvoices,
  getInvoice,
  calculateTotals
};