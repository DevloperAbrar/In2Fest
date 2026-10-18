// Live data from the gym and food modules, shown on the public marketplace profile.
// Only fields that are safe for the public are returned (no cost, tax, recipe, stock).

const { GymPlan } = require("../../database/models");
const menuService = require("../food/food.menu.service");

const num = (v) => Number(v) || 0;

function durationLabel(unit, value) {
  const v = Number(value) || 1;
  const base = unit === "days" ? "day" : "month";
  return `${v} ${base}${v > 1 ? "s" : ""}`;
}

async function gymPlans(venueId) {
  const rows = await GymPlan.findAll({
    where: { venue_id: venueId, is_active: true },
    order: [["sort_order", "ASC"], ["duration_value", "ASC"], ["price", "ASC"]],
    limit: 12
  });
  if (!rows.length) return null;

  return {
    type: "gym_plans",
    plans: rows.map((p) => {
      const price = num(p.price);
      const discount = num(p.discount_percent);
      const finalPrice = Math.round(price * (1 - discount / 100));
      const months = p.duration_unit === "months" ? Number(p.duration_value) || 1 : null;
      return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        duration_label: durationLabel(p.duration_unit, p.duration_value),
        price,
        discount_percent: discount,
        final_price: finalPrice,
        per_month: months ? Math.round(finalPrice / months) : null,
        joining_fee: num(p.joining_fee),
        pt_addon_price: num(p.pt_addon_price),
        freeze_allowed: !!p.freeze_allowed,
        max_freeze_days: p.freeze_allowed ? Number(p.max_freeze_days) || 0 : 0,
        is_popular: !!p.is_popular
      };
    })
  };
}

async function foodMenu(venueId) {
  const data = await menuService.publicMenu(venueId);
  const items = (data.items || []).slice(0, 80);
  if (!items.length) return null;

  const usedCategories = new Set(items.map((i) => i.category_id).filter(Boolean));
  return {
    type: "food_menu",
    categories: (data.categories || []).filter((c) => usedCategories.has(c.id)),
    items: items.map((i) => ({
      id: i.id,
      category_id: i.category_id || null,
      name: i.name,
      description: i.description,
      image_url: i.image_url,
      price: i.price,
      variants: (i.variants || []).filter((v) => v && v.name),
      food_type: i.food_type,
      is_bestseller: !!i.is_bestseller,
      is_available: i.is_available !== false
    }))
  };
}

// vertical: the object from getProfileSchema().vertical
// activeFeatures: the vendor's CURRENT plan features (so a downgrade hides the section instantly)
async function getLiveData(venue, vertical, activeFeatures = []) {
  try {
    if (vertical?.key === "gym" && activeFeatures.includes("gym")) return await gymPlans(venue.id);
    if (vertical?.key === "food" && activeFeatures.includes("food")) return await foodMenu(venue.id);
  } catch (err) {
    // The profile page must never fail because of this extra section.
    console.error("[MARKETPLACE] live data failed:", err.message);
  }
  return null;
}

module.exports = { getLiveData };