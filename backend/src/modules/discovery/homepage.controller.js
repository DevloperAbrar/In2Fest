const { Op, fn, col } = require("sequelize");
const { Venue, Booking } = require("../../database/models");
const { vendorSummary } = require("./search.service");
const { getLiveSlugs } = require("../../config/launchGroups");

async function getHomepage(req, res, next) {
  try {
    // Featured vendors still show only LIVE categories (hidden categories keep their own
    // pages but are not promoted on the home page).
    const liveSlugs = await getLiveSlugs();
    const live = liveSlugs.length ? { business_category: { [Op.in]: liveSlugs } } : {};

    // Same conditions as the search page (search.service.js baseWhere), so the home page
    // counters always match the "businesses found" number on /search.
    const statsWhere = {
      is_active: true,
      marketplace_listed: true,
      marketplace_suspended: false,
      business_category: { [Op.ne]: null }
    };

    const featured = await Venue.findAll({
      where: { ...statsWhere, ...live, featured_on_homepage: true },
      limit: 10
    });

    // Total businesses: every listed vendor, same as the search page.
    const totalVendors = await Venue.count({ where: statsWhere });

    // Real number of distinct cities (not capped at 10).
    const citiesCovered = await Venue.count({
      where: { ...statsWhere, city: { [Op.ne]: null } },
      distinct: true,
      col: "city"
    });

    // Top cities list is still limited to 10 for display.
    const cityRows = await Venue.findAll({
      where: statsWhere,
      attributes: ["city", [fn("COUNT", col("id")), "vendor_count"]],
      group: ["city"],
      order: [[fn("COUNT", col("id")), "DESC"]],
      limit: 10
    });

    let eventsCompleted = 0;
    try {
      eventsCompleted = await Booking.count({ where: { status: "completed" } });
    } catch {
      eventsCompleted = 0;
    }

    res.json({
      success: true,
      data: {
        featured_vendors: featured.map(vendorSummary),
        trust_stats: {
          total_vendors: totalVendors,
          cities_covered: citiesCovered,
          events_completed: eventsCompleted
        },
        top_cities: cityRows.map((r) => ({
          city: r.city,
          vendor_count: Number(r.get("vendor_count"))
        }))
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getHomepage };