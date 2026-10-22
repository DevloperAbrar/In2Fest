const { Op, literal, where: sqlWhere, cast, col } = require("sequelize");
const { Venue, City, Category } = require("../../database/models");
const { slugify, unslugify } = require("../../utils/slugify");
const { getVertical, getCardTags } = require("../../config/marketplaceVerticals");
const { getBusinessTypeKey } = require("../../config/businessTypes");
const taxonomy = require("../../config/otherBusinessTaxonomy");

const PAGE_SIZE = 20;
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

// "General" categories (Other Business and any category an admin adds with the General type)
// have no built-in kind of service, so they are grouped by the business type the vendor declares.
const isGeneral = (slug) => !!slug && getBusinessTypeKey(slug) === "general";

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

// ---------------------------------------------------------------------------
// Keyword search (the ?q= box and the autocomplete)
// A listing matches when EVERY word of the query is found somewhere in: its
// name, tagline, category, city, locality, services, sub-services or the
// "keywords" detail (Other Business). So "cctv gwalior" finds a CCTV vendor
// in Gwalior even if the business name has neither word.
// ---------------------------------------------------------------------------
const STOP_WORDS = new Set(["in", "near", "me", "the", "and", "for", "of", "at", "to"]);

function keywordTerms(q) {
  return String(q || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
    .slice(0, 5);
}

// Escape the characters that mean something inside an ILIKE pattern.
const likeEscape = (s) => s.replace(/[\\%_]/g, "\\$&");

// Every place a word can match on a listing.
function fieldConditions(pattern) {
  return [
    { hall_name: { [Op.iLike]: pattern } },
    { specialty_tagline: { [Op.iLike]: pattern } },
    { business_category: { [Op.iLike]: pattern } },
    { city: { [Op.iLike]: pattern } },
    { primary_locality: { [Op.iLike]: pattern } },
    sqlWhere(cast(col("secondary_categories"), "text"), { [Op.iLike]: pattern }),
    sqlWhere(cast(col("marketplace_services"), "text"), { [Op.iLike]: pattern }),
    sqlWhere(cast(col("marketplace_services_detail"), "text"), { [Op.iLike]: pattern }),
    sqlWhere(cast(literal("profile_attributes->'keywords'"), "text"), { [Op.iLike]: pattern }),
    sqlWhere(cast(literal("profile_attributes->'business_types'"), "text"), { [Op.iLike]: pattern }),
    sqlWhere(cast(literal("profile_attributes->'brands'"), "text"), { [Op.iLike]: pattern })
  ];
}

// One query word also matches its synonyms ("cctv" finds "security camera" listings).
function termCondition(term) {
  const variants = taxonomy.expandTerm(term);
  const list = variants.length ? variants : [term];
  return { [Op.or]: list.flatMap((t) => fieldConditions(`%${likeEscape(t)}%`)) };
}

// ---------------------------------------------------------------------------
// Business types (Other Business and other General categories)
// Which type(s) a listing belongs to is worked out by taxonomy.classifyVenue: what the vendor
// declared, else a guess from their keywords and services. The same function feeds the filter,
// the facet counts and the sitemap, so a page never shows a different count from its list.
// Results are cached for a minute per city (each server instance keeps its own copy).
// ---------------------------------------------------------------------------
const TYPE_CACHE_TTL_MS = 60 * 1000;
const typeCache = new Map();

function fromCache(key) {
  const hit = typeCache.get(key);
  return hit && Date.now() - hit.at < TYPE_CACHE_TTL_MS ? hit.value : null;
}

function toCache(key, value) {
  typeCache.set(key, { at: Date.now(), value });
  if (typeCache.size > 300) typeCache.delete(typeCache.keys().next().value);
  return value;
}

async function generalCategorySlugs() {
  const cached = fromCache("general-slugs");
  if (cached) return cached;
  const rows = await Category.findAll({ where: { active: true }, attributes: ["slug"], raw: true });
  const slugs = rows.map((r) => r.slug).filter(isGeneral);
  if (!slugs.includes("other-business")) slugs.push("other-business");
  return toCache("general-slugs", slugs);
}

async function loadGeneralVenues(cityName) {
  const key = `venues:${String(cityName || "*").toLowerCase()}`;
  const cached = fromCache(key);
  if (cached) return cached;

  const where = { ...baseWhere(), business_category: { [Op.in]: await generalCategorySlugs() } };
  if (cityName) where.city = { [Op.iLike]: cityName };

  const venues = await Venue.findAll({
    where,
    attributes: ["id", "hall_name", "business_category", "specialty_tagline", "profile_attributes", "marketplace_services"],
    limit: 5000
  });
  const rows = venues.map((v) => ({ id: v.id, category: v.business_category, types: taxonomy.classifyVenue(v) }));
  return toCache(key, rows);
}

// Ids of the listings of one business type (optionally limited to one category).
async function venueIdsForType({ city, typeSlug, category }) {
  const rows = await loadGeneralVenues(city ? unslugify(city) : null);
  return rows
    .filter((r) => (!category || r.category === category) && r.types.some((t) => t.slug === typeSlug))
    .map((r) => r.id);
}

// Business types that have listings, with counts. Powers the filter chips and the links on category pages.
async function getBusinessTypeFacets({ city, category } = {}) {
  if (category && !isGeneral(category)) return { items: [], total: 0 };
  const rows = (await loadGeneralVenues(city ? unslugify(city) : null)).filter((r) => !category || r.category === category);
  const counts = new Map();
  rows.forEach((r) => r.types.forEach((t) => {
    const cur = counts.get(t.slug) || { slug: t.slug, label: t.label, count: 0 };
    cur.count += 1;
    counts.set(t.slug, cur);
  }));
  const items = [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 40);
  return { items, total: rows.length };
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

// Up to 3 service chips for a listing card. General businesses that have not added services
// yet fall back to their keywords, so the card still says what they do.
function cardServices(venue) {
  const services = Array.isArray(venue.marketplace_services) ? venue.marketplace_services : [];
  if (services.length || !isGeneral(venue.business_category)) return services.slice(0, 3);
  const kw = venue.profile_attributes && venue.profile_attributes.keywords;
  return Array.isArray(kw) ? kw.slice(0, 3) : [];
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
  const types = isGeneral(venue.business_category) ? taxonomy.classifyVenue(venue) : [];

  const latitude = linkCoords ? linkCoords[0] : (cityRow ? parseFloat(cityRow.latitude) : null);
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
    pricing_unit: venue.pricing_unit,
    average_rating: venue.average_rating,
    review_count: venue.review_count,
    badge_verified_business: venue.badge_verified_business,
    badge_documents_verified: venue.badge_documents_verified,
    badge_premium_partner: venue.badge_premium_partner,
    marketplace_services: cardServices(venue),
    business_types: types.map((t) => t.label),
    business_type_slugs: types.map((t) => t.slug),
    business_type_label: types.length ? types[0].label : null,
    card_tags: getCardTags(
      getVertical(venue.business_category, getBusinessTypeKey(venue.business_category)),
      venue.profile_attributes || {}
    ),
    google_maps_link: link,
    // Coords: precise pin if available, else city centre as fallback
    latitude: (latitude != null && !isNaN(latitude)) ? latitude : null,
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
    q, city, category, budget_min, budget_max, capacity_min,
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

  // Business type (Other Business): ?business_type=cctv-security
  const typeSlug = taxonomy.slugifyLabel(query.business_type || "");
  if (typeSlug) {
    const ids = await venueIdsForType({ city, typeSlug, category });
    where.id = { [Op.in]: ids.length ? ids : [NIL_UUID] };
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

  // Attribute filters, for example ?f_trial_session=1&f_cuisines=Chinese
  // "1" means the yes/no attribute is true, any other text must be one of the vendor's values.
  const attrConds = [];
  Object.keys(query).forEach((k) => {
    if (attrConds.length >= 4 || !/^f_[a-z_]{1,40}$/.test(k)) return;
    const key = k.slice(2);
    const raw = String(query[k]).slice(0, 40);
    if (!raw) return;
    if (raw === "1") {
      attrConds.push({ profile_attributes: { [Op.contains]: { [key]: true } } });
    } else {
      attrConds.push({
        [Op.or]: [
          { profile_attributes: { [Op.contains]: { [key]: raw } } },
          { profile_attributes: { [Op.contains]: { [key]: [raw] } } }
        ]
      });
    }
  });

  // Keyword search: every word has to match somewhere on the listing.
  const keywordConds = keywordTerms(q).map(termCondition);

  const andConds = [...attrConds, ...keywordConds];
  if (andConds.length) where[Op.and] = andConds;

  let order = [
    ["featured_on_homepage", "DESC"],
    [literal(`(${RELEVANCE_SCORE_SQL})`), "DESC"]
  ];
  if (sort === "highest_rated") order = [["average_rating", "DESC"], ["review_count", "DESC"]];
  if (sort === "price_low") order = [["starting_price", "ASC"]];
  if (sort === "price_high") order = [["starting_price", "DESC"]];
  if (sort === "newest") order = [["created_at", "DESC"]];

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

  const terms = keywordTerms(q);
  if (!terms.length) return [];

  const venues = await Venue.findAll({
    where: {
      ...baseWhere(),
      [Op.and]: terms.map(termCondition)
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

module.exports = { search, autocomplete, vendorSummary, venueIdsForType, getBusinessTypeFacets, isGeneral, PAGE_SIZE };