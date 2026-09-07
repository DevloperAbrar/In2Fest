const { Op, fn, col } = require("sequelize");
const { Venue, City, Category, Inquiry } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { slugify } = require("../../utils/slugify");

// ─── Featured vendors ────────────────────────────────────────────────────────

async function getFeaturedVendors() {
  return Venue.findAll({ where: { featured_on_homepage: true }, order: [["hall_name", "ASC"]] });
}

async function setFeaturedVendors(venueIds) {
  if (!Array.isArray(venueIds) || venueIds.length > 10) {
    throw new AppError("Provide up to 10 venue IDs", 400);
  }
  await Venue.update({ featured_on_homepage: false }, { where: {} });
  await Venue.update({ featured_on_homepage: true }, { where: { id: venueIds } });
  return Venue.findAll({ where: { id: venueIds } });
}

// ─── Badges ──────────────────────────────────────────────────────────────────

async function setVenueBadges(venueId, badges) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) throw new AppError("Venue not found", 404);
  await venue.update({
    badge_verified_business: !!badges.badge_verified_business,
    badge_documents_verified: !!badges.badge_documents_verified,
    badge_premium_partner: !!badges.badge_premium_partner
  });
  return venue;
}

// ─── Cities ──────────────────────────────────────────────────────────────────

async function listCities() {
  return City.findAll({ order: [["name", "ASC"]] });
}

async function createCity(payload) {
  return City.create({
    name: payload.name,
    slug: payload.slug || slugify(payload.name),
    state: payload.state,
    state_slug: payload.state_slug || slugify(payload.state),
    latitude: payload.latitude,
    longitude: payload.longitude,
    active: true
  });
}

async function updateCity(cityId, payload) {
  const city = await City.findByPk(cityId);
  if (!city) throw new AppError("City not found", 404);
  await city.update(payload);
  return city;
}

// ─── Categories (dynamic CRUD) ───────────────────────────────────────────────

async function listAllCategories() {
  // Admin list  - includes inactive ones so admin can re-enable them
  return Category.findAll({ order: [["display_order", "ASC"], ["name", "ASC"]] });
}

async function createCategory(payload) {
  const { name, slug, icon, display_order, is_venue_type } = payload;
  if (!name || !name.trim()) throw new AppError("Category name is required", 400);

  const autoSlug = slug ? slug.trim() : slugify(name);

  // Slug must be unique and URL-safe
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(autoSlug)) {
    throw new AppError("Slug must be lowercase letters, numbers and hyphens only", 400);
  }

  const existing = await Category.findOne({ where: { slug: autoSlug } });
  if (existing) throw new AppError(`Slug "${autoSlug}" is already taken`, 409);

  // display_order: if not provided, put it at the end
  const maxOrder = await Category.max("display_order") || 0;

  return Category.create({
    name: name.trim(),
    slug: autoSlug,
    icon: icon || "tag",
    display_order: (display_order !== undefined && display_order !== null && display_order !== "")
      ? Number(display_order)
      : maxOrder + 1,
    active: true,
    is_venue_type: !!is_venue_type
  });
}

async function updateCategory(categoryId, payload) {
  const cat = await Category.findByPk(categoryId);
  if (!cat) throw new AppError("Category not found", 404);

  // Slug is immutable once set  - changing it breaks every live URL for that
  // category. If someone tries to change it, silently ignore the new value
  // rather than erroring, so the rest of the update still goes through.
  const { name, icon, display_order, active, is_venue_type } = payload;

  await cat.update({
    ...(name != null && { name: name.trim() }),
    ...(icon != null && { icon }),
    ...(display_order != null && { display_order }),
    ...(active != null && { active }),
    ...(is_venue_type != null && { is_venue_type })
  });

  return cat;
}

async function deleteCategory(categoryId) {
  const cat = await Category.findByPk(categoryId);
  if (!cat) throw new AppError("Category not found", 404);

  // Safety: refuse to delete if any venue is currently using this category
  const inUse = await Venue.count({ where: { business_category: cat.slug } });
  if (inUse > 0) {
    throw new AppError(
      `Cannot delete  - ${inUse} venue(s) use this category. Deactivate it instead.`,
      409
    );
  }

  await cat.destroy();
  return { deleted: true, slug: cat.slug };
}

// ─── Analytics ───────────────────────────────────────────────────────────────

async function getAnalytics() {
  const topCities = await Venue.findAll({
    where: { is_active: true, marketplace_listed: true },
    attributes: ["city", [fn("COUNT", col("id")), "count"]],
    group: ["city"],
    order: [[fn("COUNT", col("id")), "DESC"]],
    limit: 10
  });

  const topCategories = await Venue.findAll({
    where: { is_active: true, marketplace_listed: true, business_category: { [Op.ne]: null } },
    attributes: ["business_category", [fn("COUNT", col("id")), "count"]],
    group: ["business_category"],
    order: [[fn("COUNT", col("id")), "DESC"]],
    limit: 10
  });

  const marketplaceInquiries = await Inquiry.count({ where: { source: "marketplace" } });
  const subdomainInquiries = await Inquiry.count({ where: { source: "subdomain" } });

  const mostViewedVendors = await Venue.findAll({
    where: { is_active: true, marketplace_listed: true },
    order: [["review_count", "DESC"]],
    limit: 10,
    attributes: ["id", "hall_name", "city", "review_count", "average_rating"]
  });

  return {
    top_cities: topCities.map((c) => ({ city: c.city, count: Number(c.get("count")) })),
    top_categories: topCategories.map((c) => ({ category: c.business_category, count: Number(c.get("count")) })),
    marketplace_inquiries: marketplaceInquiries,
    subdomain_inquiries: subdomainInquiries,
    most_viewed_vendors: mostViewedVendors
  };
}

module.exports = {
  getFeaturedVendors, setFeaturedVendors, setVenueBadges,
  listCities, createCity, updateCity,
  listAllCategories, createCategory, updateCategory, deleteCategory,
  getAnalytics
};