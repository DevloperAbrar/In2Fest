const { BUSINESS_TYPES, NEW_CATEGORIES, CATEGORY_BUSINESS_TYPE, getBusinessProfile } = require("../../config/businessTypes");
const { getProfileSchema } = require("../../config/marketplaceSchemas");

async function listBusinessTypes(req, res, next) {
  try {
    const data = Object.values(BUSINESS_TYPES).map((t) => ({
      key: t.key,
      label: t.label,
      description: t.description,
      icon: t.icon,
      terms: t.terms,
      modules: t.modules,
      categories: Object.keys(CATEGORY_BUSINESS_TYPE).filter((slug) => CATEGORY_BUSINESS_TYPE[slug] === t.key),
      new_category_count: NEW_CATEGORIES.filter((c) => c.business_type === t.key).length
    }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getCategoryBusinessProfile(req, res, next) {
  try {
    res.json({ success: true, data: getBusinessProfile(req.params.categorySlug) });
  } catch (error) {
    next(error);
  }
}

// GET /meta/categories/:categorySlug/profile-schema?secondary=a,b
// Describes the Marketplace Profile (labels, required fields, extra attributes)
// for a category. Public, no auth - the discovery site can use it too.
async function getCategoryProfileSchema(req, res, next) {
  try {
    const secondary = String(req.query.secondary || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2);
    res.json({ success: true, data: getProfileSchema(req.params.categorySlug, secondary) });
  } catch (error) {
    next(error);
  }
}

module.exports = { listBusinessTypes, getCategoryBusinessProfile, getCategoryProfileSchema };