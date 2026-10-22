const { Op, fn, col } = require("sequelize");
const { Venue, City, Category } = require("../../database/models");
const { unslugify } = require("../../utils/slugify");
const { vendorSummary, venueIdsForType, getBusinessTypeFacets, isGeneral, PAGE_SIZE } = require("./search.service");
const taxonomy = require("../../config/otherBusinessTaxonomy");
const { AppError } = require("../../middleware/error.middleware");
const { getRedisClient } = require("../../config/redis");

async function getStates(req, res, next) {
  try {
    const cities = await City.findAll({ where: { active: true } });
    const grouped = {};
    for (const c of cities) {
      if (!grouped[c.state_slug]) grouped[c.state_slug] = { state: c.state, state_slug: c.state_slug, city_count: 0 };
      grouped[c.state_slug].city_count += 1;
    }
    res.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    next(error);
  }
}

async function getState(req, res, next) {
  try {
    const cities = await City.findAll({ where: { state_slug: req.params.stateSlug, active: true } });
    if (!cities.length) throw new AppError("State not found", 404);

    res.json({
      success: true,
      data: {
        state: cities[0].state,
        state_slug: cities[0].state_slug,
        cities
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getCityHome(req, res, next) {
  try {
    const cityName = unslugify(req.params.citySlug);

    const rows = await Venue.findAll({
      where: { is_active: true, marketplace_listed: true, city: { [Op.iLike]: cityName } },
      attributes: ["business_category", [fn("COUNT", col("id")), "vendor_count"]],
      group: ["business_category"]
    });

    const countsBySlug = {};
    rows.forEach((r) => {
      if (r.business_category) countsBySlug[r.business_category] = Number(r.get("vendor_count"));
    });

    // Categories now come live from the DB (Category Manager), not the old
    // hardcoded FIXED_CATEGORIES file  - so new categories show up here too.
    const dbCategories = await Category.findAll({
      where: { active: true },
      order: [["display_order", "ASC"], ["name", "ASC"]]
    });

    const categories = dbCategories.map((c) => ({
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      vendor_count: countsBySlug[c.slug] || 0
    }));

    res.json({
      success: true,
      data: {
        city_name: cityName,
        city_slug: req.params.citySlug,
        categories,
        seo: {
          title: `Wedding & Event Services in ${cityName} - In2Fest`,
          description: `Find and book verified wedding and event vendors in ${cityName}. Compare prices, check availability, and contact directly.`
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getCityCategory(req, res, next) {
  try {
    const { citySlug, categorySlug } = req.params;
    const page = Number(req.query.page) || 1;
    // Business type page, for example /gwalior/other-business/cctv-security (General categories only).
    const typeSlug = taxonomy.slugifyLabel(req.query.type || "");
    const cacheKey = `marketplace:city:${citySlug}:cat:${categorySlug}${typeSlug ? `:type:${typeSlug}` : ""}:page:${page}`;

    const redis = await getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    const cityName = unslugify(citySlug);
    const category = await Category.findOne({ where: { slug: categorySlug, active: true } });
    if (!category) throw new AppError("Category not found", 404);

    const where = {
      is_active: true,
      marketplace_listed: true,
      city: { [Op.iLike]: cityName },
      business_category: categorySlug
    };

    let businessType = null;
    if (typeSlug) {
      if (!isGeneral(categorySlug)) throw new AppError("Business type not found", 404);
      const ids = await venueIdsForType({ city: citySlug, typeSlug, category: categorySlug });
      // No listings means no page, so empty pages are never indexed.
      if (!ids.length) throw new AppError("Business type not found", 404);
      where.id = { [Op.in]: ids };
      const known = taxonomy.getType(typeSlug);
      const facets = await getBusinessTypeFacets({ city: citySlug, category: categorySlug });
      const fromFacet = facets.items.find((i) => i.slug === typeSlug);
      businessType = { slug: typeSlug, label: known ? known.label : (fromFacet ? fromFacet.label : typeSlug.replace(/-/g, " ")) };
    }

    const { count, rows } = await Venue.findAndCountAll({
      where,
      order: [["featured_on_homepage", "DESC"], ["average_rating", "DESC"]],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE
    });

    // The label used in headings, titles and the FAQ: the business type when there is one.
    const subject = businessType ? businessType.label : category.name;
    const lower = subject.toLowerCase();

    const responseBody = {
      success: true,
      data: {
        city_name: cityName,
        city_slug: citySlug,
        category,
        business_type: businessType,
        // Links to every business type in this city, so crawlers and visitors can reach each type page.
        type_facets: !typeSlug && isGeneral(categorySlug) ? (await getBusinessTypeFacets({ city: citySlug, category: categorySlug })).items : [],
        vendors: rows.map((v) => vendorSummary(v)),
        total: count,
        page,
        totalPages: Math.ceil(count / PAGE_SIZE),
        intro: `Looking for the best ${lower} in ${cityName}? Browse ${count} verified ${lower} on In2Fest, compare prices and reviews, and contact your favorites directly.`,
        faq: [
          {
            q: `How many ${lower} are there in ${cityName}?`,
            a: `There are ${count} verified ${lower} listed on In2Fest in ${cityName}.`
          }
        ],
        seo: {
          title: `Best ${subject} in ${cityName} - ${businessType ? "Compare Prices & Contact" : "Book Verified Vendors"} - In2Fest`,
          description: `Find verified ${lower} in ${cityName}. Compare prices, services and reviews, and contact directly. ${count} ${count === 1 ? "business" : "businesses"} listed.`
        }
      }
    };

    if (redis) await redis.setEx(cacheKey, 3600, JSON.stringify(responseBody));

    res.json(responseBody);
  } catch (error) {
    next(error);
  }
}

async function getCityCategoryLocality(req, res, next) {
  try {
    const { citySlug, categorySlug, localitySlug } = req.params;
    const cityName = unslugify(citySlug);
    const localityName = unslugify(localitySlug);
    const category = await Category.findOne({ where: { slug: categorySlug, active: true } });
    if (!category) throw new AppError("Category not found", 404);

    const page = Number(req.query.page) || 1;
    const { count, rows } = await Venue.findAndCountAll({
      where: {
        is_active: true,
        marketplace_listed: true,
        city: { [Op.iLike]: cityName },
        business_category: categorySlug,
        primary_locality: { [Op.iLike]: localityName }
      },
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE
    });

    res.json({
      success: true,
      data: {
        city_name: cityName,
        locality_name: localityName,
        category,
        vendors: rows.map(vendorSummary),
        total: count,
        page,
        totalPages: Math.ceil(count / PAGE_SIZE),
        seo: {
          title: `Best ${category.name} in ${localityName}, ${cityName} - In2Fest`,
          description: `Find verified ${category.name.toLowerCase()} in ${localityName}, ${cityName}.`
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

// Add this function before module.exports:

async function getCitiesWithVendors(req, res, next) {
  try {
    // Distinct city names that have at least one active, marketplace-listed vendor
    const rows = await Venue.findAll({
      where: { is_active: true, marketplace_listed: true, city: { [Op.ne]: null } },
      attributes: [[fn("DISTINCT", col("city")), "city"]],
      raw: true
    });

    const cityNames = rows.map((r) => r.city).filter(Boolean);

    // Enrich with slug/state from the cities table where available
    const cityRecords = await City.findAll({
      where: { name: { [Op.in]: cityNames }, active: true },
      attributes: ["name", "slug", "state"],
      raw: true
    });
    const cityMap = {};
    cityRecords.forEach((c) => { cityMap[c.name.toLowerCase()] = c; });

    const data = cityNames
      .map((name) => {
        const record = cityMap[name.toLowerCase()];
        return {
          name,
          slug: record?.slug || name.toLowerCase().replace(/\s+/g, "-"),
          state: record?.state || ""
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}


module.exports = { getStates, getState, getCityHome, getCityCategory, getCityCategoryLocality, getCitiesWithVendors };