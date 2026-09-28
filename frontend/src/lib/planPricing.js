// Presets the super admin can pick for the offer name
export const OFFER_PRESETS = [
    { label: "Diwali Sale", emoji: "🪔" },
    { label: "Shaadi Season Offer", emoji: "💍" },
    { label: "Holi Special", emoji: "🎨" },
    { label: "Navratri Offer", emoji: "🎉" },
    { label: "New Year Offer", emoji: "🎆" },
    { label: "Republic Day Sale", emoji: "🇮🇳" },
    { label: "Launch Offer", emoji: "🚀" }
  ];
  
  export function getCyclePricing(plan, cycle = "monthly") {
    const yearly = cycle === "yearly";
    const p = plan?.pricing;
    const offer = p?.offer || { active: false, name: null, percent: 0, ends_at: null };
  
    let original;
    let final;
    let perMonth;
    let savingsPercent = 0;
  
    if (p) {
      const d = yearly ? p.yearly : p.monthly;
      original = d.original;
      final = d.final;
      perMonth = yearly ? p.yearly.per_month : d.final;
      savingsPercent = yearly ? p.yearly.savings_percent : 0;
    } else {
      const m = Number(plan?.monthly_price) || 0;
      original = yearly ? m * 12 : m;
      final = original;
      perMonth = m;
    }
  
    return {
      original,
      final,
      perMonth,
      savingsPercent,
      offer,
      hasDiscount: offer.active && final < original,
      isFree: Number(plan?.monthly_price) === 0,
      cycleLabel: yearly ? "/yr" : "/mo"
    };
  }
  
  // The offer to show in the top banner (highest active discount)
  export function getBestOffer(plans = []) {
    return plans
      .map((p) => p.pricing?.offer)
      .filter((o) => o?.active)
      .sort((a, b) => b.percent - a.percent)[0] || null;
  }
  
  // Biggest "yearly vs monthly" saving across plans, for the toggle badge
  export function getMaxYearlySavings(plans = []) {
    return plans.reduce((max, p) => Math.max(max, p.pricing?.yearly?.savings_percent || 0), 0);
  }
  
  export function getDaysLeft(endsAt) {
    if (!endsAt) return null;
    return Math.max(0, Math.ceil((new Date(endsAt) - Date.now()) / 86400000));
  }