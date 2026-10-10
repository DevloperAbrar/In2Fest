// Frontend mirror of backend/src/utils/taxEngine.js. Keep both in sync so the live
// preview always matches the saved document and the PDF.

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function calculateLine(item, ctx) {
  const quantity = Math.max(num(item.quantity), 0);
  const rate = Math.max(num(item.rate), 0);
  const base = r2(quantity * rate);

  const discountType = item.discount_type || "none";
  const discountValue = Math.max(num(item.discount_value), 0);
  let lineDiscount = 0;
  if (discountType === "percentage") lineDiscount = base * (clamp(discountValue, 0, 100) / 100);
  else if (discountType === "flat") lineDiscount = discountValue;
  lineDiscount = r2(clamp(lineDiscount, 0, base));

  const taxRate = ctx.gstEnabled ? clamp(num(item.tax_rate, ctx.defaultGstRate), 0, 100) : 0;

  return {
    ...item,
    quantity,
    rate,
    line_discount_amount: lineDiscount,
    amount: r2(base - lineDiscount),
    tax_rate: taxRate
  };
}

export function calculateDocument(rawItems, opts = {}) {
  const gstEnabled = Boolean(opts.gstEnabled);
  const defaultGstRate = clamp(num(opts.defaultGstRate, 18), 0, 100);
  const inter = opts.supplyType === "inter";
  const inclusive = Boolean(opts.priceIncludesTax);
  const ctx = { gstEnabled, defaultGstRate };

  const lines = (rawItems || []).map((i) => calculateLine(i, ctx));
  const subtotal = r2(lines.reduce((s, l) => s + l.amount, 0));

  const discountType = opts.discountType || "none";
  const discountValue = Math.max(num(opts.discountValue), 0);
  let discountAmount = 0;
  if (discountType === "percentage") discountAmount = subtotal * (clamp(discountValue, 0, 100) / 100);
  else if (discountType === "flat") discountAmount = discountValue;
  discountAmount = r2(clamp(discountAmount, 0, subtotal));

  let allocated = 0;
  const groups = new Map();

  lines.forEach((l, idx) => {
    let share = 0;
    if (subtotal > 0 && discountAmount > 0) {
      if (idx === lines.length - 1) share = r2(discountAmount - allocated);
      else {
        share = r2((discountAmount * l.amount) / subtotal);
        allocated = r2(allocated + share);
      }
    }
    const net = r2(l.amount - share);

    let taxable = net;
    let tax = 0;
    if (gstEnabled && l.tax_rate > 0) {
      if (inclusive) {
        taxable = r2(net / (1 + l.tax_rate / 100));
        tax = r2(net - taxable);
      } else {
        tax = r2((net * l.tax_rate) / 100);
      }
    }
    l.taxable_value = taxable;
    l.tax_amount = tax;

    const g = groups.get(l.tax_rate) || { rate: l.tax_rate, taxable: 0, tax: 0 };
    g.taxable = r2(g.taxable + taxable);
    g.tax = r2(g.tax + tax);
    groups.set(l.tax_rate, g);
  });

  const taxBreakup = [];
  let cgst = 0, sgst = 0, igst = 0;

  if (gstEnabled) {
    [...groups.values()]
      .sort((a, b) => a.rate - b.rate)
      .forEach((g) => {
        if (g.rate <= 0) return;
        const entry = { rate: g.rate, taxable: g.taxable, cgst: 0, sgst: 0, igst: 0, tax: g.tax };
        if (inter) {
          entry.igst = g.tax;
        } else {
          entry.cgst = r2(g.tax / 2);
          entry.sgst = r2(g.tax - entry.cgst);
        }
        cgst = r2(cgst + entry.cgst);
        sgst = r2(sgst + entry.sgst);
        igst = r2(igst + entry.igst);
        taxBreakup.push(entry);
      });
  }

  const taxableAmount = r2(lines.reduce((s, l) => s + l.taxable_value, 0));
  const totalTax = r2(cgst + sgst + igst);
  const grand = r2(taxableAmount + totalTax);
  const rounded = opts.roundOff ? Math.round(grand) : grand;

  return {
    lineItems: lines,
    subtotal,
    discountAmount,
    taxableAmount,
    taxBreakup,
    cgst,
    sgst,
    igst,
    totalTax,
    roundOff: r2(rounded - grand),
    total: r2(rounded)
  };
}

/* ---------- shared constants + helpers ---------- */

export const GST_RATES = [0, 5, 12, 18, 28];
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" }
];

export const DOC_TYPES = ["invoice", "quotation", "proforma", "credit_note"];
export const DEFAULT_LABELS = {
  invoice: "Invoice",
  quotation: "Quotation",
  proforma: "Proforma Invoice",
  credit_note: "Credit Note"
};
export const DEFAULT_BILLING = {
  docTypes: DOC_TYPES,
  docLabels: DEFAULT_LABELS,
  units: ["nos", "hour", "day", "month", "service"],
  defaultUnit: "nos",
  defaultGstRate: 18,
  taxCodeLabel: "SAC",
  roundOff: true,
  dueDays: 0,
  customFields: [],
  defaultTerms: "",
  customerRequired: false,
  paymentMode: "later",
  showDueDate: true,
  showTaxCode: true,
  itemPlaceholder: "Item or service name",
  extraCharges: []
};

export const INDIAN_STATES = [
  ["01", "Jammu & Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"], ["04", "Chandigarh"],
  ["05", "Uttarakhand"], ["06", "Haryana"], ["07", "Delhi"], ["08", "Rajasthan"],
  ["09", "Uttar Pradesh"], ["10", "Bihar"], ["11", "Sikkim"], ["12", "Arunachal Pradesh"],
  ["13", "Nagaland"], ["14", "Manipur"], ["15", "Mizoram"], ["16", "Tripura"],
  ["17", "Meghalaya"], ["18", "Assam"], ["19", "West Bengal"], ["20", "Jharkhand"],
  ["21", "Odisha"], ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"], ["24", "Gujarat"],
  ["26", "Dadra & Nagar Haveli and Daman & Diu"], ["27", "Maharashtra"], ["29", "Karnataka"],
  ["30", "Goa"], ["31", "Lakshadweep"], ["32", "Kerala"], ["33", "Tamil Nadu"],
  ["34", "Puducherry"], ["35", "Andaman & Nicobar"], ["36", "Telangana"],
  ["37", "Andhra Pradesh"], ["38", "Ladakh"]
].map(([code, name]) => ({ code, name }));

export const inr = (n, decimals = 2) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(n) || 0);

export const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

// One display status for every document type.
export function deriveStatus(doc) {
  const today = todayStr();
  if (doc.type === "quotation") {
    if (doc.converted_to) return "converted";
    if (doc.validity_date && doc.validity_date < today) return "expired";
    return doc.status === "draft" ? "draft" : "sent";
  }
  if (doc.type === "credit_note") return doc.status === "draft" ? "draft" : "issued";
  if (doc.payment_status === "paid") return "paid";
  if (doc.status === "draft" && Number(doc.amount_paid) <= 0) return "draft";
  if (doc.due_date && doc.due_date < today && Number(doc.balance_due) > 0.009) return "overdue";
  if (doc.payment_status === "partial") return "partial";
  return "unpaid";
}

export const STATUS_META = {
  draft: { label: "Draft", cls: "bg-navy-50 text-navy-500 ring-navy-200" },
  sent: { label: "Sent", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  unpaid: { label: "Unpaid", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  partial: { label: "Partially paid", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  paid: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  overdue: { label: "Overdue", cls: "bg-red-50 text-red-700 ring-red-200" },
  converted: { label: "Converted", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  expired: { label: "Expired", cls: "bg-red-50 text-red-600 ring-red-200" },
  issued: { label: "Issued", cls: "bg-sky-50 text-sky-700 ring-sky-200" }
};