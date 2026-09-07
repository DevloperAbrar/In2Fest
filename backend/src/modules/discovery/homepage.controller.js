const { Op, fn, col } = require("sequelize");
const { Venue, Booking } = require("../../database/models");
const { vendorSummary } = require("./search.service");

async function getHomepage(req, res, next) {
  try {
    const featured = await Venue.findAll({
      where: { is_active: true, marketplace_listed: true, featured_on_homepage: true },
      limit: 10
    });

    const totalVendors = await Venue.count({ where: { is_active: true, marketplace_listed: true } });

    const cityRows = await Venue.findAll({
      where: { is_active: true, marketplace_listed: true },
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
          cities_covered: cityRows.length,
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