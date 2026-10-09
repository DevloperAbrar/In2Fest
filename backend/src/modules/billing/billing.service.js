const { Invoice, Client } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { getSequelize } = require("../../utils/db");
const { calculateDocument, r2 } = require("../../utils/taxEngine");
const { generateInvoiceNumber } = require("../../utils/invoiceNumberGenerator");
const { getBusinessProfile } = require("../../config/businessTypes");
const { uploadToR2 } = require("../../middleware/upload.middleware");
const { generateUpiQr } = require("./qr.generator");
const { generateInvoicePdf } = require("./pdf.generator");
const dayjs = require("dayjs");

const DOC_TYPES = ["quotation", "invoice", "proforma", "credit_note"];
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDocType(t) {
  return DOC_TYPES.includes(t) ? t : "invoice";
}

function cleanDate(v) {
  return typeof v === "string" && DATE_RE.test(v) ? v : null;
}

function sanitizeCustomFields(input) {
  const out = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  Object.entries(input).slice(0, 10).forEach(([k, v]) => {
    if (/^[a-zA-Z0-9_]{1,40}$/.test(k) && v !== null && v !== undefined && String(v).trim()) {
      out[k] = String(v).trim().slice(0, 200);
    }
  });
  return out;
}

async function resolveCustomer(venue, body, existing) {
  let clientRecord = null;
  let clientId = existing?.client_id || null;

  const hasClientKey = body.client_id !== undefined;
  if (hasClientKey && body.client_id) {
    clientRecord = await Client.findOne({ where: { id: body.client_id, venue_id: venue.id } });
    if (!clientRecord) throw new AppError("Client not found", 404);
    clientId = clientRecord.id;
  } else if (hasClientKey) {
    clientId = null; // explicit walk-in
  } else if (clientId) {
    clientRecord = await Client.findOne({ where: { id: clientId, venue_id: venue.id } });
  }

  const sameClient = Boolean(existing) && clientId === existing.client_id;
  const prev = sameClient ? existing.customer_snapshot || {} : {};
  const c = body.customer && typeof body.customer === "object" ? body.customer : {};

  const pick = (key, max) => {
    const fromClient = clientRecord && ["name", "phone", "email"].includes(key) ? clientRecord[key] : undefined;
    const v = c[key] ?? fromClient ?? prev[key];
    return v ? String(v).trim().slice(0, max) : "";
  };

  const gstin = pick("gstin", 15).toUpperCase();
  if (gstin && !GSTIN_RE.test(gstin)) throw new AppError("Customer GSTIN is not valid", 400);

  let stateCode = pick("state_code", 2);
  if (!/^\d{2}$/.test(stateCode)) stateCode = gstin ? gstin.slice(0, 2) : "";

  const snapshot = {
    name: pick("name", 150) || "Walk-in Customer",
    phone: pick("phone", 20),
    email: pick("email", 150),
    address: pick("address", 300),
    gstin,
    state_code: stateCode
  };

  return { clientId, clientRecord, snapshot };
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new AppError("Add at least one line item", 400);
  if (items.length > 100) throw new AppError("A document can have at most 100 line items", 400);
  items.forEach((it, i) => {
    const n = i + 1;
    if (!it || !String(it.description || "").trim()) throw new AppError(`Line item ${n} needs a description`, 400);
    if (!(Number(it.quantity) > 0)) throw new AppError(`Line item ${n} needs a quantity greater than 0`, 400);
    if (!(Number(it.rate) >= 0)) throw new AppError(`Line item ${n} has an invalid rate`, 400);
    if (it.tax_rate !== undefined && it.tax_rate !== null && it.tax_rate !== "") {
      const t = Number(it.tax_rate);
      if (!(t >= 0 && t <= 100)) throw new AppError(`Line item ${n} has an invalid tax rate`, 400);
    }
  });
}

/**
 * Turns a request body (and optionally the existing record) into the exact column values to store.
 * All validation + tax math happens here so create / update / convert behave identically.
 */
async function buildDocumentFields(venue, body, existing = null) {
  const type = existing ? existing.type : normalizeDocType(body.type);
  const profile = getBusinessProfile(venue.business_category);

  const gstEnabled = Boolean(body.gst_enabled ?? existing?.gst_enabled ?? venue.gst_enabled);
  if (gstEnabled && !venue.gst_number) {
    throw new AppError("GST is enabled for this document, but no GSTIN is set for this business. Add a GSTIN in Settings first.", 400);
  }

  const items = body.line_items ?? existing?.line_items;
  validateItems(items);

  const { clientId, clientRecord, snapshot } = await resolveCustomer(venue, body, existing);

  const supplierState = String(venue.gst_number || "").slice(0, 2);
  const bodyPlace = /^\d{2}$/.test(String(body.place_of_supply || "")) ? String(body.place_of_supply) : "";
  const customerState = snapshot.state_code || bodyPlace || existing?.place_of_supply || "";
  const supplyType = gstEnabled && supplierState && customerState && supplierState !== customerState ? "inter" : "intra";

  const existingRate = existing && Number(existing.gst_rate) > 0 ? Number(existing.gst_rate) : undefined;
  const calc = calculateDocument(items, {
    gstEnabled,
    defaultGstRate: body.gst_rate ?? existingRate ?? profile.billing.defaultGstRate,
    supplyType,
    priceIncludesTax: Boolean(body.price_includes_tax ?? existing?.price_includes_tax),
    discountType: body.discount_type ?? existing?.discount_type,
    discountValue: body.discount_value ?? existing?.discount_value,
    roundOff: body.round_off ?? profile.billing.roundOff
  });

  const amountPaid = r2(existing?.amount_paid || 0);
  const balanceDue = type === "quotation" ? calc.total : Math.max(r2(calc.total - amountPaid), 0);

  let dueDate = cleanDate(body.due_date) ?? (existing ? existing.due_date : null);
  if (!dueDate && type === "invoice" && profile.billing.dueDays > 0) {
    dueDate = dayjs().add(profile.billing.dueDays, "day").format("YYYY-MM-DD");
  }

  const fields = {
    type,
    client_id: clientId,
    customer_snapshot: snapshot,
    booking_id: body.booking_id ?? existing?.booking_id ?? null,
    line_items: calc.lineItems,
    subtotal: calc.subtotal,
    discount_type: calc.discountType,
    discount_value: calc.discountValue,
    discount_amount: calc.discountAmount,
    taxable_amount: calc.taxableAmount,
    gst_enabled: gstEnabled,
    gst_rate: calc.gstRate,
    cgst_amount: calc.cgst,
    sgst_amount: calc.sgst,
    igst_amount: calc.igst,
    tax_breakup: calc.taxBreakup,
    supply_type: supplyType,
    place_of_supply: gstEnabled ? customerState || supplierState || null : null,
    price_includes_tax: Boolean(body.price_includes_tax ?? existing?.price_includes_tax),
    round_off: calc.roundOff,
    total: calc.total,
    amount_paid: amountPaid,
    balance_due: balanceDue,
    payment_status: type === "quotation" ? "unpaid" : existing?.payment_status || "unpaid",
    validity_date: cleanDate(body.validity_date) ?? (existing ? existing.validity_date : null),
    due_date: dueDate,
    payment_terms: body.payment_terms !== undefined ? String(body.payment_terms || "").slice(0, 100) : existing?.payment_terms || null,
    terms: body.terms !== undefined ? body.terms : existing ? existing.terms : profile.billing.defaultTerms || null,
    notes: body.notes !== undefined ? body.notes : existing?.notes || null,
    custom_fields: body.custom_fields !== undefined ? sanitizeCustomFields(body.custom_fields) : existing?.custom_fields || {}
  };

  return { fields, clientRecord };
}

function buildPdfCustomer(clientRecord, snapshot) {
  const base = clientRecord ? (clientRecord.toJSON ? clientRecord.toJSON() : clientRecord) : {};
  return { ...base, ...snapshot };
}

async function renderAndStorePdf(invoice, venue, pdfCustomer) {
  const payable = Number(invoice.balance_due) > 0 ? invoice.balance_due : invoice.total;
  const upiQrBuffer = venue.upi_id && invoice.type !== "quotation" && invoice.type !== "credit_note"
    ? await generateUpiQr(venue.upi_id, venue.hall_name, payable, invoice.invoice_number)
    : null;

  const pdfBuffer = await generateInvoicePdf(invoice, venue, pdfCustomer, upiQrBuffer);

  const fileName = `${invoice.type}-${String(invoice.invoice_number).replace(/[^a-zA-Z0-9]/g, "")}.pdf`;
  const pdfUrl = await uploadToR2(pdfBuffer, fileName, "invoices", "application/pdf");
  if (!pdfUrl) throw new AppError("Storage not configured. Please set R2 credentials to store PDFs.", 500);
  return pdfUrl;
}

async function safeRollback(t) {
  try {
    if (t && !t.finished) await t.rollback();
  } catch (_) { /* already finished */ }
}

/** Creates a document atomically: number + row + PDF succeed together or not at all. */
async function createDocument(venue, body, hooks = {}) {
  const { fields, clientRecord } = await buildDocumentFields(venue, body, null);

  const sequelize = getSequelize();
  const t = await sequelize.transaction();
  try {
    const number = await generateInvoiceNumber(venue.id, venue.hall_name, fields.type, t);

    const invoice = await Invoice.create(
      { ...fields, venue_id: venue.id, invoice_number: number, status: "draft", qr_code_url: null },
      { transaction: t }
    );

    invoice.pdf_url = await renderAndStorePdf(invoice, venue, buildPdfCustomer(clientRecord, fields.customer_snapshot));
    await invoice.save({ transaction: t });

    if (hooks.afterCreate) await hooks.afterCreate(invoice, t);

    await t.commit();
    return invoice;
  } catch (error) {
    await safeRollback(t);
    throw error;
  }
}

async function updateDocument(venue, invoice, body) {
  const { fields, clientRecord } = await buildDocumentFields(venue, body, invoice);
  invoice.set(fields);
  invoice.pdf_url = await renderAndStorePdf(invoice, venue, buildPdfCustomer(clientRecord, fields.customer_snapshot));
  await invoice.save();
  return invoice;
}

// Keeps the existing UI working: walk-in documents still get a `client` object.
function toApi(invoice) {
  const plain = invoice.toJSON ? invoice.toJSON() : { ...invoice };
  if (!plain.client) {
    const s = plain.customer_snapshot || {};
    plain.client = { id: null, name: s.name || "Walk-in Customer", phone: s.phone || "", email: s.email || "" };
  }
  return plain;
}

module.exports = {
  DOC_TYPES,
  buildDocumentFields,
  buildPdfCustomer,
  renderAndStorePdf,
  createDocument,
  updateDocument,
  toApi,
  safeRollback
};