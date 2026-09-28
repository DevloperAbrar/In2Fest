// Single source of truth for plan pricing + GST.
// Everything (plan API, checkout, subscriptions) goes through here.

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

function getAmountForCycle(plan, cycle) {
  const pricing = getPlanPricing(plan);
  return normalizeCycle(cycle) === "yearly" ? pricing.yearly.final : pricing.monthly.final;
}

/**
 * Compute the full checkout quote with GST and referral credit.
 *
 * @param {object} plan         - Sequelize Plan instance
 * @param {string} cycle        - "monthly"|"yearly"
 * @param {number} creditAvail  - available referral credit (≥0)
 * @param {number} gstRate      - e.g. 18
 * @param {number} referralFriendPercent - e.g. 12
 * @returns {object} quote
 */
function computeQuote(plan, cycle, creditAvail = 0, gstRate = 18, referralFriendPercent = 12) {
  const pricing = getPlanPricing(plan);
  const planPrice = normalizeCycle(cycle) === "yearly" ? pricing.yearly.final : pricing.monthly.final;

  // Effective offer discount percent (plan offer or referral friend discount, whichever is bigger)
  const offerPercent = pricing.offer.active ? pricing.offer.percent : 0;
  const discountPercent = Math.max(offerPercent, referralFriendPercent);

  // Base is plan raw (pre-discount) price for the cycle
  const rawBase = normalizeCycle(cycle) === "yearly" ? pricing.yearly.original : pricing.monthly.original;
  const discountAmount = roundRupee((rawBase * discountPercent) / 100);
  const afterDiscount = roundRupee(rawBase - discountAmount);

  // Credit: cannot exceed afterDiscount
  const creditToUse = roundRupee(Math.min(Number(creditAvail) || 0, afterDiscount));
  const taxableAmount = roundRupee(afterDiscount - creditToUse);

  const gstAmount = roundRupee((taxableAmount * gstRate) / 100);
  const totalPayable = roundRupee(taxableAmount + gstAmount);

  return {
    plan_price: rawBase,
    offer_percent: discountPercent,
    discount_amount: discountAmount,
    after_discount: afterDiscount,
    credit_available: creditAvail,
    credit_used: creditToUse,
    taxable_amount: taxableAmount,
    gst_rate: gstRate,
    gst_amount: gstAmount,
    total_payable: totalPayable,
    is_free: totalPayable === 0
  };
}

module.exports = {
  MAX_DISCOUNT,
  normalizeCycle,
  isOfferActive,
  getPlanPricing,
  getAmountForCycle,
  roundRupee,
  computeQuote
};