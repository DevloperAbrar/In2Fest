const { Op } = require("sequelize");
const { Venue } = require("../../database/models");
const { unslugify } = require("../../utils/slugify");
const { vendorSummary } = require("./search.service");
const { AppError } = require("../../middleware/error.middleware");

async function getVendorProfile(req, res, next) {
  try {
    const { citySlug, categorySlug, vendorSlug } = req.params;
    const cityName = unslugify(citySlug);

    const venue = await Venue.findOne({
      where: {
        subdomain: vendorSlug,
        business_category: categorySlug,
        city: { [Op.iLike]: cityName },
        is_active: true,
        marketplace_listed: true
      }
    });

    if (!venue) throw new AppError("Vendor profile not found", 404);

    const similar = await Venue.findAll({
      where: {
        id: { [Op.ne]: venue.id },
        city: { [Op.iLike]: cityName },
        business_category: categorySlug,
        is_active: true,
        marketplace_listed: true
      },
      limit: 4
    });

    const description150 = (venue.long_description || "").slice(0, 155);

    res.json({
      success: true,
      data: {
        venue,
        similar_vendors: similar.map(vendorSummary),
        seo: {
          title: `${venue.hall_name} - ${categorySlug.replace(/-/g, " ")} in ${cityName} - In2Fest`,
          description: description150 || `${venue.hall_name}  - ${categorySlug.replace(/-/g, " ")} in ${cityName}. View gallery, pricing, and reviews on CampusSafar.`
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

async function resolveThirdSegment(req, res, next) {
  try {
    const { citySlug, categorySlug, slug } = req.params;
    const cityName = unslugify(citySlug);

    const vendor = await Venue.findOne({
      where: {
        subdomain: slug,
        business_category: categorySlug,
        city: { [Op.iLike]: cityName },
        is_active: true,
        marketplace_listed: true
      }
    });

    if (vendor) {
      return res.json({ success: true, data: { type: "vendor" } });
    }

    res.json({ success: true, data: { type: "locality" } });
  } catch (error) {
    next(error);
  }
}

module.exports = { getVendorProfile, resolveThirdSegment };