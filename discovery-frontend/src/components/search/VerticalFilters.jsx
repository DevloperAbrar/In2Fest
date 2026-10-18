import React, { useEffect } from "react";

const GYM = ["gym-fitness"];
const FOOD = ["restaurant", "bakery-sweets", "cloud-kitchen"];
const SHOPS = ["kirana-store", "clothing-store", "electronics-store", "mobile-shop", "pharmacy", "stationery-store"];
const EVENTS = ["marriage-hall", "banquet-hall", "party-lawn", "farmhouse"];

// key = attribute key, value "1" means yes/no attribute is true.
const GROUPS = [
  { slugs: GYM, items: [
    { key: "trial_session", value: "1", label: "Free trial" },
    { key: "gym_type", value: "Women only", label: "Women only" },
    { key: "diet_plans", value: "1", label: "Diet plans" }
  ] },
  { slugs: FOOD, items: [
    { key: "food_type", value: "Pure vegetarian", label: "Pure veg" },
    { key: "dining_options", value: "Home delivery", label: "Home delivery" },
    { key: "table_reservation", value: "1", label: "Table booking" },
    { key: "family_friendly", value: "1", label: "Family friendly" }
  ] },
  { slugs: SHOPS, items: [
    { key: "home_delivery", value: "1", label: "Home delivery" },
    { key: "emi_available", value: "1", label: "EMI" },
    { key: "open_sunday", value: "1", label: "Open Sundays" }
  ] },
  { slugs: EVENTS, items: [
    { key: "ac_hall", value: "1", label: "AC hall" },
    { key: "catering_policy", value: "Outside caterers allowed", label: "Outside caterers" },
    { key: "dj_allowed", value: "1", label: "DJ allowed" }
  ] }
];

export default function VerticalFilters({ category, filters, onChange }) {
  const group = GROUPS.find((g) => g.slugs.includes(category));
  const allowed = new Set((group?.items || []).map((i) => `f_${i.key}`));

  // Drop attribute filters that belong to another category when the category changes.
  useEffect(() => {
    const stale = Object.keys(filters).filter((k) => k.startsWith("f_") && !allowed.has(k));
    if (!stale.length) return;
    const next = { ...filters };
    stale.forEach((k) => delete next[k]);
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  if (!group) return null;

  const toggle = (item) => {
    const k = `f_${item.key}`;
    const next = { ...filters, page: undefined };
    if (filters[k] === item.value) delete next[k];
    else next[k] = item.value;
    onChange(next);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {group.items.map((item) => {
        const on = filters[`f_${item.key}`] === item.value;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => toggle(item)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${on ? "bg-navy-700 text-white border-navy-700" : "bg-white text-gray-600 border-gray-200 hover:border-navy-300"}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}