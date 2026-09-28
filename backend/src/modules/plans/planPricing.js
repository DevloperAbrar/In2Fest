// Single source of truth for plan pricing. Everything (plan API, checkout,
// subscriptions) goes through here so displayed price === charged price.

const MAX_DISCOUNT = 90;

function roundRupee(n) {
  return Math.round(Number(n) || 0);
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

module.exports = { MAX_DISCOUNT, normalizeCycle, isOfferActive, getPlanPricing, getAmountForCycle };