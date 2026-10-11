const { Category } = require("../database/models");

const DEFAULT_MAX_SECONDARY = 2;

/**
 * secondary_categories drives real, user-facing search behavior (a vendor
 * shows up under a category as "also offers this service" if it's in this
 * array) - so it can never be trusted as raw client input. This enforces,
 * server-side:
 *  - every slug is a real, currently-active Category
 *  - it is never the vendor's own primary category
 *  - the count never exceeds the limit set on the PRIMARY category
 *    (categories.max_secondary_categories, default 2, 0 = single only)
 */
async function sanitizeSecondaryCategories(candidates, primaryCategory) {
  const requested = Array.isArray(candidates) ? candidates : [];
  if (requested.length === 0) return [];

  // The limit belongs to the primary category. Look it up even if the admin
  // has since deactivated it, so existing vendors keep a stable rule.
  let limit = DEFAULT_MAX_SECONDARY;
  if (primaryCategory) {
    const primaryRow = await Category.findOne({
      where: { slug: primaryCategory },
      attributes: ["slug", "max_secondary_categories"]
    });
    const stored = primaryRow?.max_secondary_categories;
    if (Number.isInteger(stored) && stored >= 0) limit = stored;
  }
  if (limit === 0) return [];

  const activeCategories = await Category.findAll({ where: { active: true }, attributes: ["slug"] });
  const validSlugs = new Set(activeCategories.map((c) => c.slug));

  return [...new Set(requested)]
    .filter((slug) => validSlugs.has(slug) && slug !== primaryCategory)
    .slice(0, limit);
}

module.exports = { sanitizeSecondaryCategories };