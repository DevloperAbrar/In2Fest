const { Category } = require("../../database/models");
const {
  BUSINESS_TYPES,
  isValidBusinessType,
  getBusinessTypeKey,
  getBusinessProfile
} = require("../../config/businessTypes");
const { getProfileSchema } = require("../../config/marketplaceSchemas");

// GET /meta/business-types
// Lists every business type with the ACTIVE categories currently assigned to it
// (read from the database, so it follows whatever Super Admin configures).
async function listBusinessTypes(req, res, next) {
  try {
    const rows = await Category.findAll({
      where: { active: true },
      attributes: ["slug", "business_type"],
      order: [["display_order", "ASC"], ["name", "ASC"]]
    });

    const slugsByType = {};
    rows.forEach((row) => {
      const key = isValidBusinessType(row.business_type) ? row.business_type : getBusinessTypeKey(row.slug);
      (slugsByType[key] = slugsByType[key] || []).push(row.slug);
    });

    const data = Object.values(BUSINESS_TYPES).map((t) => ({
      key: t.key,
      label: t.label,
      description: t.description,
      icon: t.icon,
      terms: t.terms,
      modules: t.modules,
      categories: slugsByType[t.key] || [],
      category_count: (slugsByType[t.key] || []).length
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