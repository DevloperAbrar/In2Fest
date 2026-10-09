const { Invoice, Venue, Client } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { getSequelize } = require("../../utils/db");
const { calculateDocument, r2 } = require("../../utils/taxEngine");
const { sendWhatsApp } = require("../whatsapp/whatsapp.service");
const billingService = require("./billing.service");
const crypto = require("crypto");

const PAYMENT_METHODS = ["cash", "upi", "card", "bank_transfer", "cheque", "other"];

// Backwards-compatible helper (other modules may import it). Intra-state, no round-off.
function calculateTotals(rawLineItems, { gstEnabled, gstRate, discountType, discountValue } = {}) {
  const calc = calculateDocument(rawLineItems, {
    gstEnabled,
    defaultGstRate: gstRate ?? 18,
    discountType,
    discountValue,
    supplyType: "intra",
    roundOff: false
  });
  return {
    lineItems: calc.lineItems,
    subtotal: calc.subtotal,
    discountType: calc.discountType,
    discountValue: calc.discountValue,
    discountAmount: calc.discountAmount,
    taxableAmount: calc.taxableAmount,
    gstRate: calc.gstRate,
    cgst: calc.cgst,
    sgst: calc.sgst,
    total: calc.total
  };
}

async function loadVenue(venueId) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) throw new AppError("Venue not found", 404);
  return venue;
}

async function createInvoice(req, res, next) {
  try {
    const venue = await loadVenue(req.params.venueId);
    const invoice = await billingService.createDocument(venue, req.body || {});
    const full = await Invoice.findByPk(invoice.id, { include: [{ model: Client, as: "client" }] });
    res.status(201).json({ success: true, data: billingService.toApi(full) });
  } catch (error) {
    next(error);
  }
}

async function updateInvoice(req, res, next) {
  try {
    const venue = await loadVenue(req.params.venueId);

    const invoice = await Invoice.findOne({ where: { id: req.params.invoiceId, venue_id: venue.id } });
    if (!invoice) throw new AppError("Invoice not found", 404);

    if (invoice.status !== "draft") {
      throw new AppError("Only draft documents can be edited. This one has already been shared.", 400);
    }
    if (Number(invoice.amount_paid) > 0) {
      throw new AppError("This document already has payments recorded and can't be edited.", 400);
    }

    await billingService.updateDocument(venue, invoice, req.body || {});
    const full = await Invoice.findByPk(invoice.id, { include: [{ model: Client, as: "client" }] });
    res.json({ success: true, data: billingService.toApi(full) });
  } catch (error) {
    next(error);
  }
}

async function deleteInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.invoiceId, venue_id: req.params.venueId } });
    if (!invoice) throw new AppError("Invoice not found", 404);

    if (invoice.status !== "draft" || Number(invoice.amount_paid) > 0) {
      throw new AppError("Only unshared drafts without payments can be deleted.", 400);
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

    const snap = invoice.customer_snapshot || {};
    const phone = invoice.client?.phone || snap.phone;
    const name = invoice.client?.name || snap.name || "Customer";
    if (!phone) throw new AppError("This customer has no phone number. Add one and try again.", 400);
    if (!invoice.pdf_url) throw new AppError("This document has no PDF yet. Edit and save it once, then share.", 400);

    await sendWhatsApp({
      venueId: req.params.venueId,
      recipientPhone: phone,
      triggerType: "invoice_shared",
      variables: {
        customerName: name,
        invoiceNumber: invoice.invoice_number,
        pdfLink: invoice.pdf_url
      }
    });

    if (invoice.status === "draft") {
      invoice.status = "sent"; // never downgrade a paid document
      await invoice.save();
    }

    res.json({ success: true, data: billingService.toApi(invoice) });
  } catch (error) {
    next(error);
  }
}

async function getInvoices(req, res, next) {
  try {
    const where = { venue_id: req.params.venueId };
    if (billingService.DOC_TYPES.includes(req.query.type)) where.type = req.query.type;
    if (["unpaid", "partial", "paid"].includes(req.query.payment_status)) where.payment_status = req.query.payment_status;

    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 1000);

    const invoices = await Invoice.findAll({
      where,
      include: [{ model: Client, as: "client" }],
      order: [["created_at", "DESC"]],
      limit
    });
    res.json({ success: true, data: invoices.map(billingService.toApi) });
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
    res.json({ success: true, data: billingService.toApi(invoice) });
  } catch (error) {
    next(error);
  }
}

// POST /invoices/:invoiceId/payments  { amount, method, reference?, note?, paid_at? }
async function recordPayment(req, res, next) {
  const sequelize = getSequelize();
  const t = await sequelize.transaction();
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.invoiceId, venue_id: req.params.venueId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!invoice) throw new AppError("Invoice not found", 404);
    if (invoice.type === "quotation" || invoice.type === "credit_note") {
      throw new AppError("Payments can only be recorded against invoices.", 400);
    }

    const amount = r2(req.body.amount);
    if (!(amount > 0)) throw new AppError("Enter a payment amount greater than 0", 400);

    const balance = r2(Number(invoice.total) - Number(invoice.amount_paid));
    if (amount > balance + 0.009) {
      throw new AppError(`Payment exceeds the balance due (Rs. ${balance.toFixed(2)})`, 400);
    }

    const method = PAYMENT_METHODS.includes(req.body.method) ? req.body.method : "other";
    const paidAt = req.body.paid_at && !isNaN(new Date(req.body.paid_at).getTime())
      ? new Date(req.body.paid_at).toISOString()
      : new Date().toISOString();

    const payment = {
      id: crypto.randomUUID(),
      amount,
      method,
      reference: req.body.reference ? String(req.body.reference).slice(0, 100) : "",
      note: req.body.note ? String(req.body.note).slice(0, 300) : "",
      paid_at: paidAt,
      recorded_by: req.user?.id || null
    };

    const payments = [...(invoice.payments || []), payment];
    const amountPaid = r2(payments.reduce((s, p) => s + Number(p.amount), 0));
    const balanceDue = Math.max(r2(Number(invoice.total) - amountPaid), 0);

    invoice.payments = payments;
    invoice.amount_paid = amountPaid;
    invoice.balance_due = balanceDue;
    invoice.payment_status = balanceDue <= 0.009 ? "paid" : "partial";
    if (invoice.payment_status === "paid") invoice.status = "paid";

    await invoice.save({ transaction: t });
    await t.commit();

    // Best effort: refresh the PDF so it shows Amount Paid / Balance Due. Never fails the payment.
    try {
      const venue = await Venue.findByPk(invoice.venue_id);
      const clientRecord = invoice.client_id ? await Client.findByPk(invoice.client_id) : null;
      invoice.pdf_url = await billingService.renderAndStorePdf(
        invoice,
        venue,
        billingService.buildPdfCustomer(clientRecord, invoice.customer_snapshot || {})
      );
      await invoice.save();
    } catch (pdfError) {
      console.error("[BILLING] PDF refresh after payment failed:", pdfError.message);
    }

    res.status(201).json({ success: true, data: billingService.toApi(invoice), payment });
  } catch (error) {
    await billingService.safeRollback(t);
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
  recordPayment,
  calculateTotals
};