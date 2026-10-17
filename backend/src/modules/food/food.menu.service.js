const { FoodCategory, FoodItem, FoodIngredient, FoodUnit } = require("./food.models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const C = require("./food.constants");
const { UUID_RE } = require("./food.core");

const str = (v, max) => String(v ?? "").trim().slice(0, max);
const r3 = (n) => Math.round(Number(n) * 1000) / 1000;

async function ownedId(Model, venueId, id, label) {
  const row = UUID_RE.test(String(id)) ? await Model.findOne({ where: { id, venue_id: venueId } }) : null;
  if (!row) throw new AppError(`${label} not found`, 404);
  return row.id;
}

/* ---------------- categories ---------------- */
const listCategories = (venueId) =>
  FoodCategory.findAll({ where: { venue_id: venueId, is_active: true }, order: [["sort_order", "ASC"], ["name", "ASC"]] });

async function createCategory(venueId, b) {
  const name = str(b.name, 80);
  if (name.length < 2) throw new AppError("Enter a category name", 400);
  const n = await FoodCategory.count({ where: { venue_id: venueId } });
  return FoodCategory.create({ venue_id: venueId, name, sort_order: n });
}

async function updateCategory(venueId, id, b) {
  const row = await FoodCategory.findOne({ where: { id, venue_id: venueId } });
  if (!row) throw new AppError("Category not found", 404);
  const out = {};
  if (b.name !== undefined) {
    out.name = str(b.name, 80);
    if (out.name.length < 2) throw new AppError("Enter a category name", 400);
  }
  if (b.sort_order !== undefined) out.sort_order = U.num(b.sort_order, "Order", { min: 0, max: 1000, int: true });
  await row.update(out);
  return row;
}

async function removeCategory(venueId, id) {
  const row = await FoodCategory.findOne({ where: { id, venue_id: venueId } });
  if (!row) throw new AppError("Category not found", 404);
  await FoodItem.update({ category_id: null }, { where: { venue_id: venueId, category_id: id } });
  await row.destroy();
  return { removed: true };
}

/* ---------------- items ---------------- */
async function cleanRecipe(venueId, raw) {
  const list = (Array.isArray(raw) ? raw : []).slice(0, 20).filter((r) => r && UUID_RE.test(String(r.ingredient_id)) && Number(r.qty) > 0);
  if (!list.length) return [];
  const found = await FoodIngredient.findAll({ where: { id: [...new Set(list.map((r) => r.ingredient_id))], venue_id: venueId }, attributes: ["id"] });
  const ok = new Set(found.map((f) => f.id));
  return list.filter((r) => ok.has(r.ingredient_id)).map((r) => ({ ingredient_id: r.ingredient_id, qty: r3(r.qty) }));
}

async function cleanItem(venueId, b, existing = null) {
  const out = {};
  if (!existing || b.name !== undefined) {
    const name = str(b.name, 120);
    if (name.length < 2) throw new AppError("Enter the dish name", 400);
    out.name = name;
  }
  if (b.description !== undefined) out.description = str(b.description, 300) || null;
  if (b.food_type !== undefined) {
    if (!C.FOOD_TYPES.includes(b.food_type)) throw new AppError("Choose veg, non-veg or egg", 400);
    out.food_type = b.food_type;
  }
  if (b.spice_level !== undefined) out.spice_level = U.num(b.spice_level, "Spice level", { min: 0, max: 3, int: true });
  if (b.tax_rate !== undefined) out.tax_rate = b.tax_rate === "" || b.tax_rate === null ? null : U.num(b.tax_rate, "Tax rate", { min: 0, max: 40 });
  if (b.prep_time_min !== undefined) out.prep_time_min = b.prep_time_min === "" || b.prep_time_min === null ? null : U.num(b.prep_time_min, "Prep time", { min: 1, max: 240, int: true });
  ["is_available", "show_on_website", "is_bestseller"].forEach((k) => { if (b[k] !== undefined) out[k] = Boolean(b[k]); });
  if (b.image_url !== undefined) out.image_url = str(b.image_url, 500) || null;
  if (b.category_id !== undefined) out.category_id = b.category_id ? await ownedId(FoodCategory, venueId, b.category_id, "Category") : null;
  if (b.unit_id !== undefined) out.unit_id = b.unit_id ? await ownedId(FoodUnit, venueId, b.unit_id, "Stall / outlet") : null;
  if (b.recipe !== undefined) out.recipe = await cleanRecipe(venueId, b.recipe);

  if (b.variants !== undefined) {
    out.variants = (Array.isArray(b.variants) ? b.variants : []).slice(0, 6)
      .map((v) => ({ name: str(v && v.name, 30), price: U.num(v && v.price, "Size price", { min: 0, max: 100000 }) }))
      .filter((v) => v.name);
  }
  const variants = out.variants !== undefined ? out.variants : (existing && existing.variants) || [];
  if (variants.length) out.price = Math.min(...variants.map((v) => v.price));
  else if (b.price !== undefined || !existing) out.price = U.num(b.price, "Price", { min: 0, max: 100000 });
  return out;
}

async function listItems(venueId, { q } = {}) {
  const [rows, ings] = await Promise.all([
    FoodItem.findAll({ where: { venue_id: venueId, is_active: true }, order: [["sort_order", "ASC"], ["name", "ASC"]] }),
    FoodIngredient.findAll({ where: { venue_id: venueId }, attributes: ["id", "cost_per_unit"] })
  ]);
  const cost = new Map(ings.map((i) => [i.id, Number(i.cost_per_unit)]));
  const needle = q ? String(q).toLowerCase() : "";
  return rows
    .filter((r) => !needle || r.name.toLowerCase().includes(needle))
    .map((r) => {
      const j = r.toJSON();
      j.price = Number(j.price);
      j.tax_rate = j.tax_rate === null ? null : Number(j.tax_rate);
      const food_cost = U.money((j.recipe || []).reduce((s, x) => s + Number(x.qty) * (cost.get(x.ingredient_id) || 0), 0));
      j.food_cost = food_cost || null;
      j.food_cost_percent = food_cost && j.price > 0 ? Math.round((food_cost / j.price) * 100) : null;
      return j;
    });
}

async function createItem(venueId, b) {
  return FoodItem.create({ venue_id: venueId, ...(await cleanItem(venueId, b)) });
}

async function updateItem(venueId, id, b) {
  const row = await FoodItem.findOne({ where: { id, venue_id: venueId, is_active: true } });
  if (!row) throw new AppError("Item not found", 404);
  await row.update(await cleanItem(venueId, b, row));
  return row;
}

async function setAvailability(venueId, id, available) {
  const row = await FoodItem.findOne({ where: { id, venue_id: venueId, is_active: true } });
  if (!row) throw new AppError("Item not found", 404);
  await row.update({ is_available: Boolean(available) });
  return row;
}

async function removeItem(venueId, id) {
  const row = await FoodItem.findOne({ where: { id, venue_id: venueId, is_active: true } });
  if (!row) throw new AppError("Item not found", 404);
  await row.update({ is_active: false });
  return { removed: true };
}

async function setPhoto(venueId, id, url) {
  const row = await FoodItem.findOne({ where: { id, venue_id: venueId, is_active: true } });
  if (!row) throw new AppError("Item not found", 404);
  await row.update({ image_url: url });
  return { image_url: url };
}

// One-tap onboarding: a ready menu the owner only has to edit prices on.
async function installStarter(venue) {
  const existing = await FoodItem.count({ where: { venue_id: venue.id, is_active: true } });
  if (existing > 0) throw new AppError("Your menu already has items", 409);
  const kind = venue.business_category === "bakery-sweets" ? "bakery-sweets" : "restaurant";
  let count = 0;
  for (const [i, [catName, dishes]] of C.STARTER_MENU[kind].entries()) {
    const cat = await FoodCategory.create({ venue_id: venue.id, name: catName, sort_order: i });
    await FoodItem.bulkCreate(dishes.map(([name, price, food_type, best, variants], j) => {
      const vs = (variants || []).map(([n, p]) => ({ name: n, price: p }));
      return {
        venue_id: venue.id, category_id: cat.id, name, food_type, is_bestseller: Boolean(best), sort_order: j,
        variants: vs, price: vs.length ? Math.min(...vs.map((v) => v.price)) : price
      };
    }));
    count += dishes.length;
  }
  return { categories: C.STARTER_MENU[kind].length, items: count };
}

// What the public ordering page may see. Never exposes recipe, cost, tax or stock.
async function publicMenu(venueId) {
  const [cats, items, units] = await Promise.all([
    FoodCategory.findAll({ where: { venue_id: venueId, is_active: true }, order: [["sort_order", "ASC"], ["name", "ASC"]] }),
    FoodItem.findAll({ where: { venue_id: venueId, is_active: true, show_on_website: true }, order: [["sort_order", "ASC"], ["name", "ASC"]] }),
    FoodUnit.findAll({ where: { venue_id: venueId, is_active: true }, attributes: ["id", "name"] })
  ]);
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  return {
    categories: cats.map((c) => ({ id: c.id, name: c.name })),
    items: items.map((i) => ({
      id: i.id, category_id: i.category_id, name: i.name, description: i.description || "", image_url: i.image_url || "",
      price: Number(i.price), variants: i.variants || [], food_type: i.food_type, spice_level: i.spice_level,
      is_bestseller: i.is_bestseller, is_available: i.is_available, prep_time_min: i.prep_time_min,
      stall: i.unit_id ? unitName.get(i.unit_id) || null : null
    }))
  };
}

module.exports = {
  listCategories, createCategory, updateCategory, removeCategory,
  listItems, createItem, updateItem, setAvailability, removeItem, setPhoto, installStarter, publicMenu
};