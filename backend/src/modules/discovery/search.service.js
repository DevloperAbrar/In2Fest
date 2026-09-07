const { Op, literal } = require("sequelize");
const { Venue, City, Category } = require("../../database/models");
const { slugify, unslugify } = require("../../utils/slugify");

const PAGE_SIZE = 20;

/**
 * Weighted relevance score, computed in SQL so sorting/pagination stays
 * database-driven instead of pulling every row into memory.
 *
 * Weighting rationale:
 *   - Premium Partner (30) is the strongest signal  - it's a paid/curated
 *     placement, so it should outrank quality signals alone.
 *   - Verified Business (15) and Documents Verified (10) are trust signals
 *     from the platform, weighted below Premium but above raw rating.
 *   - average_rating (0–5) is scaled by 10 (0–50) so a 5-star, unverified,
 *     non-premium vendor can still compete with a verified one.
 *   - review_count is capped at 50 via LEAST() and scaled lightly (x0.2,
 *     max +10) as a confidence signal  - a 5.0 rating from 1 review shouldn't
 *     outrank a 4.6 rating from 40 reviews, but it also shouldn't be ignored.
 */
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

function vendorSummary(venue) {
  return {
    id: venue.id,
    hall_name: venue.hall_name,
    subdomain: venue.subdomain,
    city: venue.city,
    primary_locality: venue.primary_locality,
    business_category: venue.business_category,
    hero_image_url: venue.hero_image_url,
    starting_price: venue.starting_price,
    average_rating: venue.average_rating,
    review_count: venue.review_count,
    badge_verified_business: venue.badge_verified_business,
    badge_documents_verified: venue.badge_documents_verified,
    badge_premium_partner: venue.badge_premium_partner,
    marketplace_services: (venue.marketplace_services || []).slice(0, 3)
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

  // "relevant" (default) blends curation + trust badges + quality signals via
  // RELEVANCE_SCORE_SQL. Explicit sorts (rating/price/newest) are a deliberate
  // user choice and stay untouched by badges  - a shopper who picks "Price: low
  // to high" wants exactly that, not a badge-reordered version of it.
  let order = [
    ["featured_on_homepage", "DESC"],
    [literal(`(${RELEVANCE_SCORE_SQL})`), "DESC"]
  ];
  if (sort === "highest_rated") order = [["average_rating", "DESC"], ["review_count", "DESC"]];
  if (sort === "price_low") order = [["starting_price", "ASC"]];
  if (sort === "price_high") order = [["starting_price", "DESC"]];
  if (sort === "newest") order = [["created_at", "DESC"]];

  const offset = (Number(page) - 1) * Number(limit);

  const { rows, count } = await Venue.findAndCountAll({
    where,
    order,
    limit: Number(limit),
    offset
  });

  return {
    results: rows.map(vendorSummary),
    total: count,
    page: Number(page),
    totalPages: Math.ceil(count / Number(limit))
  };
}

async function autocomplete(q) {
  if (!q || q.length < 2) return [];

  const venues = await Venue.findAll({
    where: {
      ...baseWhere(),
      [Op.or]: [
        { hall_name: { [Op.iLike]: `%${q}%` } },
        { city: { [Op.iLike]: `%${q}%` } },
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