// Single source of truth for plan pricing + GST.
// Everything (plan API, checkout, subscriptions) goes through here.
const env = require("../../config/env");

const MAX_DISCOUNT = 90;

function roundRupee(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function normalizeCycle(cycle) {
  return cycle === "yearly" ? "yearly" : "monthly";
}

function isOfferActive(plan, now = new Date()) {
  const percent = Number(plan.discount_percent) || 0;
  if (percent <= 0) return false;
  if (plan.offer_ends_at && new Date(plan.offer_ends_at) < now) return false;
  return true;
}

function getBaseYearly(plan) {
  const yearly = Number(plan.yearly_price);
  return yearly > 0 ? yearly : (Number(plan.monthly_price) || 0) * 12;
}

function getPlanPricing(plan) {
  const monthlyOriginal = roundRupee(plan.monthly_price);
  const yearlyOriginal = roundRupee(getBaseYearly(plan));

  const active = isOfferActive(plan);
  const percent = active ? Number(plan.discount_percent) : 0;
  const applyDiscount = (value) => roundRupee(value - (value * percent) / 100);

  const monthlyFinal = applyDiscount(monthlyOriginal);
  const yearlyFinal = applyDiscount(yearlyOriginal);

  const fullYearOfMonthly = monthlyFinal * 12;
  const savings = Math.max(0, fullYearOfMonthly - yearlyFinal);

  return {
    // true = the prices below already include GST
    gst_inclusive: plan.gst_inclusive === true,
    offer: {
      active,
      name: active ? plan.offer_name || null : null,
      percent,
      ends_at: active ? plan.offer_ends_at || null : null
    },
    monthly: { original: monthlyOriginal, final: monthlyFinal },
    yearly: {
      original: yearlyOriginal,
      final: yearlyFinal,
      per_month: roundRupee(yearlyFinal / 12),
      savings_vs_monthly: savings,
      savings_percent: fullYearOfMonthly > 0 ? Math.round((savings / fullYearOfMonthly) * 100) : 0
    }
  };
}

// The price the vendor SEES for this cycle (includes GST when the plan is GST-inclusive).
function getAmountForCycle(plan, cycle) {
  const pricing = getPlanPricing(plan);
  return normalizeCycle(cycle) === "yearly" ? pricing.yearly.final : pricing.monthly.final;
}

// The price WITHOUT GST for this cycle. This is what Subscription.locked_price stores,
// so revenue and MRR numbers are always ex-GST, for inclusive and exclusive plans alike.
function getLockedPriceForCycle(plan, cycle, gstRate = env.gstRate) {
  const sticker = getAmountForCycle(plan, cycle);
  if (plan.gst_inclusive === true && sticker > 0) {
    return roundRupee(sticker / (1 + gstRate / 100));
  }
  return sticker;
}

/**
 * Compute the full checkout quote with GST and referral credit.
 *
 * Exclusive plan (default): GST is added on top of the price.
 * Inclusive plan (plan.gst_inclusive): the price already contains GST, so the vendor
 * pays exactly the shown price and GST is split out of it.
 *
 * All "plan_price / discount_amount / after_discount / taxable_amount" fields are
 * WITHOUT GST in both modes, so Payment rows and invoices stay consistent.
 * The gross_* fields are what the vendor sees on an inclusive plan.
 */
function computeQuote(plan, cycle, creditAvail = 0, gstRate = 18, referralFriendPercent = 12) {
  const pricing = getPlanPricing(plan);
  const yearly = normalizeCycle(cycle) === "yearly";
  const inclusive = plan.gst_inclusive === true;
  const factor = 1 + gstRate / 100;

  // Effective offer discount percent (plan offer or referral friend discount, whichever is bigger)
  const offerPercent = pricing.offer.active ? pricing.offer.percent : 0;
  const discountPercent = Math.max(offerPercent, referralFriendPercent);

  // Sticker price for the cycle, before discount (GST included when inclusive)
  const rawSticker = yearly ? pricing.yearly.original : pricing.monthly.original;
  const grossDiscount = roundRupee((rawSticker * discountPercent) / 100);
  const grossAfterDiscount = roundRupee(rawSticker - grossDiscount);

  // Ex-GST figures
  const planPrice = inclusive ? roundRupee(rawSticker / factor) : rawSticker;
  const afterDiscount = inclusive ? roundRupee(grossAfterDiscount / factor) : grossAfterDiscount;
  const discountAmount = roundRupee(planPrice - afterDiscount);

  // Credit: cannot exceed afterDiscount (ex-GST, same rule as before)
  const creditToUse = roundRupee(Math.min(Number(creditAvail) || 0, afterDiscount));
  const taxableAmount = roundRupee(afterDiscount - creditToUse);

  let gstAmount;
  let totalPayable;
  if (inclusive && creditToUse === 0) {
    // Vendor pays exactly the shown price. GST is whatever is left after the taxable part.
    totalPayable = grossAfterDiscount;
    gstAmount = roundRupee(totalPayable - taxableAmount);
  } else {
    gstAmount = roundRupee((taxableAmount * gstRate) / 100);
    totalPayable = roundRupee(taxableAmount + gstAmount);
  }

  return {
    gst_inclusive: inclusive,
    plan_price: planPrice,
    offer_percent: discountPercent,
    discount_amount: discountAmount,
    after_discount: afterDiscount,
    credit_available: creditAvail,
    credit_used: creditToUse,
    taxable_amount: taxableAmount,
    gst_rate: gstRate,
    gst_amount: gstAmount,
    total_payable: totalPayable,
    // What the vendor sees on a GST-inclusive plan
    gross_plan_price: rawSticker,
    gross_discount_amount: grossDiscount,
    gross_after_discount: grossAfterDiscount,
    is_free: totalPayable === 0
  };
}

module.exports = {
  MAX_DISCOUNT,
  normalizeCycle,
  isOfferActive,
  getPlanPricing,
  getAmountForCycle,
  getLockedPriceForCycle,
  roundRupee,
  computeQuote
};