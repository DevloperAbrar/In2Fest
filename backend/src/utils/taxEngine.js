// Pure, dependency-free billing math. One source of truth for quotations, invoices,
// proformas and credit notes across every business type.

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
    description: String(item.description || "").trim(),
    quantity,
    rate,
    discount_type: discountType,
    discount_value: discountValue,
    line_discount_amount: lineDiscount,
    amount: r2(base - lineDiscount),
    tax_rate: taxRate,
    hsn_sac: item.hsn_sac ? String(item.hsn_sac).trim().slice(0, 10) : "",
    unit: item.unit ? String(item.unit).trim().slice(0, 20) : ""
  };
}

/**
 * @param {Array} rawItems  [{description, quantity, rate, discount_type, discount_value, tax_rate?, hsn_sac?, unit?}]
 * @param {Object} opts     { gstEnabled, defaultGstRate, supplyType: "intra"|"inter",
 *                            priceIncludesTax, discountType, discountValue, roundOff }
 */
function calculateDocument(rawItems, opts = {}) {
  const gstEnabled = Boolean(opts.gstEnabled);
  const defaultGstRate = clamp(num(opts.defaultGstRate, 18), 0, 100);
  const inter = opts.supplyType === "inter";
  const inclusive = Boolean(opts.priceIncludesTax);
  const ctx = { gstEnabled, defaultGstRate };

  const lines = (rawItems || []).map((i) => calculateLine(i, ctx));
  const subtotal = r2(lines.reduce((s, l) => s + l.amount, 0));

  // Overall (bill-level) discount
  const discountType = opts.discountType || "none";
  const discountValue = Math.max(num(opts.discountValue), 0);
  let discountAmount = 0;
  if (discountType === "percentage") discountAmount = subtotal * (clamp(discountValue, 0, 100) / 100);
  else if (discountType === "flat") discountAmount = discountValue;
  discountAmount = r2(clamp(discountAmount, 0, subtotal));

  // Spread the bill-level discount across lines so each tax slab is computed on the right base.
  let allocated = 0;
  const groups = new Map(); // rate -> { rate, taxable, tax }

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

  const doRound = opts.roundOff !== false && opts.roundOff !== undefined ? Boolean(opts.roundOff) : false;
  const rounded = doRound ? Math.round(grand) : grand;
  const roundOff = r2(rounded - grand);

  return {
    lineItems: lines,
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    taxableAmount,
    gstRate: taxBreakup.length === 1 ? taxBreakup[0].rate : 0,
    cgst,
    sgst,
    igst,
    taxBreakup,
    roundOff,
    total: r2(rounded)
  };
}

module.exports = { calculateDocument, r2 };