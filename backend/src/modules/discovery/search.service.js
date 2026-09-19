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

function vendorSummary(venue, cityRow) {
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
  };
}

async function search(query) {
  const {
    city, category, budget_min, budget_max, capacity_min,
    rating, services, date, sort = "relevant", page = 1, limit = PAGE_SIZE
  } = query;

  const where = baseWhere();

  if (city) where.city = { [Op.iLike]: unslugify(city) };
  if (category) where.business_category = category;
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

  const offset = (Number(page) - 1) * Number(limit);

  const { rows, count } = await Venue.findAndCountAll({ where, order, limit: Number(limit), offset });

  // Fetch city coords for all unique city names in one query, then map by name.
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
    results: rows.map((v) => vendorSummary(v, cityMap[v.city] || null)),
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