const { Op, fn, col } = require("sequelize");
const { Venue, City, Category } = require("../../database/models");
const { unslugify } = require("../../utils/slugify");
const { vendorSummary, PAGE_SIZE } = require("./search.service");
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
    const cacheKey = `marketplace:city:${citySlug}:cat:${categorySlug}:page:${page}`;

    const redis = await getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    const cityName = unslugify(citySlug);
    const category = await Category.findOne({ where: { slug: categorySlug, active: true } });
    if (!category) throw new AppError("Category not found", 404);

    const { count, rows } = await Venue.findAndCountAll({
      where: {
        is_active: true,
        marketplace_listed: true,
        city: { [Op.iLike]: cityName },
        business_category: categorySlug
      },
      order: [["featured_on_homepage", "DESC"], ["average_rating", "DESC"]],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE
    });

    const responseBody = {
      success: true,
      data: {
        city_name: cityName,
        city_slug: citySlug,
        category,
        vendors: rows.map(vendorSummary),
        total: count,
        page,
        totalPages: Math.ceil(count / PAGE_SIZE),
        intro: `Looking for the best ${category.name.toLowerCase()} in ${cityName}? Browse ${count} verified ${category.name.toLowerCase()} on CampusSafar, compare prices and reviews, and contact your favorites directly.`,
        faq: [
          {
            q: `How many ${category.name.toLowerCase()} are there in ${cityName}?`,
            a: `There are ${count} verified ${category.name.toLowerCase()} listed on In2Fest in ${cityName}.`
          }
        ],
        seo: {
          title: `Best ${category.name} in ${cityName} - Book Verified Vendors - In2Fest`,
          description: `Find and book verified ${category.name.toLowerCase()} in ${cityName}. Compare prices, check availability, and contact directly. ${count} vendors listed.`
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

module.exports = { getStates, getState, getCityHome, getCityCategory, getCityCategoryLocality };