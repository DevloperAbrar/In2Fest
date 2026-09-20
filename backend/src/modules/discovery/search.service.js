const { Op, literal } = require("sequelize");
const { Venue, City, Category } = require("../../database/models");
const { slugify, unslugify } = require("../../utils/slugify");

const PAGE_SIZE = 20;

const RELEVANCE_SCORE_SQL = `
  (CASE WHEN badge_premium_partner THEN 30 ELSE 0 END) +
  (CASE WHEN badge_verified_business THEN 15 ELSE 0 END) +
  (CASE WHEN badge_documents_verified THEN 10 ELSE 0 END) +
  (COALESCE(average_rating, 0) * 10) +
  (LEAST(COALESCE(review_count, 0), 50) * 0.2)
`.trim();

// Category slugs only ever come out of Category.slug / the slugify() util,
// which only ever produces lowercase letters, digits and hyphens. Used as a
// safety gate before a category value is interpolated into a raw SQL
// literal (for the "primary match first" ORDER BY below) - if a value ever
// doesn't match this shape, we simply skip the literal instead of building
// unsafe SQL with it.
const SAFE_SLUG_RE = /^[a-z0-9-]+$/;

function baseWhere() {
  return { is_active: true, marketplace_listed: true, business_category: { [Op.ne]: null } };
}

// Extracts [lat, lng] from a Google Maps link string.
// Returns null if no coords found (e.g. short URLs like maps.app.goo.gl).
function extractCoordsFromLink(link = "") {
  const pin = link.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (pin) return [parseFloat(pin[1]), parseFloat(pin[2])];
  const at = link.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (at) return [parseFloat(at[1]), parseFloat(at[2])];
  const q = link.match(/[?&](?:q|query|ll)=(-?\d+\.?\d+),\s*(-?\d+\.?\d+)/);
  if (q) return [parseFloat(q[1]), parseFloat(q[2])];
  return null;
}

// `matchedCategory`: the category slug the caller searched for, if any.
// When present, flags each vendor as "primary" (this IS their main
// business_category) or "secondary" (they only offer it via their
// self-declared secondary_categories) so the frontend can rank/group real
// specialists above vendors who just also offer the service. Callers that
// don't pass it (homepage/city/similar-vendors listings) get category_match:
// null, same as before this field existed - fully backward compatible.
function vendorSummary(venue, cityRow, matchedCategory) {
  // Try to get precise coords from the vendor's own Google Maps link first.
  // If that fails (e.g. maps.app.goo.gl short URL), fall back to the city's
  // centre coordinates so the vendor still appears on the map.
  const link = venue.google_maps_link || "";
  const linkCoords = extractCoordsFromLink(link);

  const latitude  = linkCoords ? linkCoords[0] : (cityRow ? parseFloat(cityRow.latitude)  : null);
  const longitude = linkCoords ? linkCoords[1] : (cityRow ? parseFloat(cityRow.longitude) : null);

  return {
    id: venue.id,
    hall_name: venue.hall_name,
    subdomain: venue.subdomain,
    slug: venue.subdomain,
    city: venue.city,
    city_slug: slugify(venue.city || ""),
    category_slug: venue.business_category,
    primary_locality: venue.primary_locality,
    business_category: venue.business_category,
    hero_image_url: venue.hero_image_url,
    cover_photo: venue.hero_image_url,
    starting_price: venue.starting_price,
    average_rating: venue.average_rating,
    review_count: venue.review_count,
    badge_verified_business: venue.badge_verified_business,
    badge_documents_verified: venue.badge_documents_verified,
    badge_premium_partner: venue.badge_premium_partner,
    marketplace_services: (venue.marketplace_services || []).slice(0, 3),
    google_maps_link: link,
    // Coords: precise pin if available, else city centre as fallback
    latitude:  (latitude  != null && !isNaN(latitude))  ? latitude  : null,
    longitude: (longitude != null && !isNaN(longitude)) ? longitude : null,
    // Flag so MapView can show a slightly different marker for city-centre fallback
    coords_are_approximate: !linkCoords && !!(cityRow?.latitude),
    // "primary" | "secondary" | null - see comment above the function.
    category_match: matchedCategory
      ? (venue.business_category === matchedCategory ? "primary" : "secondary")
      : null,
  };
}

async function search(query) {
  const {
    city, category, budget_min, budget_max, capacity_min,
    rating, services, date, sort = "relevant", page = 1, limit = PAGE_SIZE
  } = query;

  const where = baseWhere();

  if (city) where.city = { [Op.iLike]: unslugify(city) };

  // A vendor genuinely belongs to a category either as their primary
  // business_category OR as one of up to 2 self-declared secondary_categories.
  // secondary_categories is now sanitized on every save (see
  // sanitizeSecondaryCategories) - capped at 2, must be real active
  // categories, can't duplicate the primary one - so this can be trusted.
  if (category) {
    where[Op.or] = [
      { business_category: category },
      { secondary_categories: { [Op.contains]: [category] } }
    ];
  }

  if (budget_min || budget_max) {
    where.starting_price = {};
    if (budget_min) where.starting_price[Op.gte] = Number(budget_min);
    if (budget_max) where.starting_price[Op.lte] = Number(budget_max);
  }
  if (capacity_min) where.capacity = { [Op.gte]: Number(capacity_min) };
  if (rating) where.average_rating = { [Op.gte]: Number(rating) };
  if (services) {
    const serviceList = services.split(",").map((s) => s.trim()).filter(Boolean);
    if (serviceList.length) where.marketplace_services = { [Op.contains]: serviceList };
  }

  let order = [
    ["featured_on_homepage", "DESC"],
    [literal(`(${RELEVANCE_SCORE_SQL})`), "DESC"]
  ];
  if (sort === "highest_rated") order = [["average_rating", "DESC"], ["review_count", "DESC"]];
  if (sort === "price_low")     order = [["starting_price", "ASC"]];
  if (sort === "price_high")    order = [["starting_price", "DESC"]];
  if (sort === "newest")        order = [["created_at", "DESC"]];

  // Primary-category listings float above ones offering it only as a
  // secondary service, whatever sort is chosen. SAFE_SLUG_RE gate means this
  // can never become unsafe raw SQL even in principle.
  if (category && SAFE_SLUG_RE.test(category)) {
    order = [
      [literal(`(CASE WHEN business_category = '${category}' THEN 1 ELSE 0 END)`), "DESC"],
      ...order
    ];
  }

  const offset = (Number(page) - 1) * Number(limit);

  const { rows, count } = await Venue.findAndCountAll({ where, order, limit: Number(limit), offset });

  const cityNames = [...new Set(rows.map((v) => v.city).filter(Boolean))];
  let cityMap = {};
  if (cityNames.length > 0) {
    const cities = await City.findAll({
      where: { name: { [Op.in]: cityNames } },
      attributes: ["name", "latitude", "longitude"],
    });
    cities.forEach((c) => { cityMap[c.name] = c; });
  }

  return {
    results: rows.map((v) => vendorSummary(v, cityMap[v.city] || null, category || null)),
    total: count,
    page: Number(page),
    totalPages: Math.ceil(count / Number(limit)),
  };
}

async function autocomplete(q) {
  if (!q || q.length < 2) return [];

  const venues = await Venue.findAll({
    where: {
      ...baseWhere(),
      [Op.or]: [
        { hall_name: { [Op.iLike]: `%${q}%` } },
        { city:      { [Op.iLike]: `%${q}%` } },
        { business_category: { [Op.iLike]: `%${q}%` } }
      ]
    },
    limit: 8,
    attributes: ["id", "hall_name", "city", "business_category", "subdomain"]
  });

  return venues.map((v) => ({
    label: v.hall_name,
    city: v.city,
    category: v.business_category,
    url: `/${slugify(v.city)}/${v.business_category}/${v.subdomain}`
  }));
}

module.exports = { search, autocomplete, vendorSummary, PAGE_SIZE };