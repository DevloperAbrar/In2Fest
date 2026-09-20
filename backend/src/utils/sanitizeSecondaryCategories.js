const { Category } = require("../database/models");

/**
 * secondary_categories drives real, user-facing search behavior (a vendor
 * shows up under a category as "also offers this service" if it's in this
 * array) - so it can never be trusted as raw client input. This enforces,
 * server-side, the same cap the picker UI is supposed to enforce
 * client-side (max 2), and additionally requires every slug to be a real,
 * currently-active Category and never the vendor's own primary category.
 * Without this, a vendor record can end up tagged under categories it has
 * nothing to do with, which is exactly what happened before this existed.
 */
async function sanitizeSecondaryCategories(candidates, primaryCategory) {
  const requested = Array.isArray(candidates) ? candidates : [];
  if (requested.length === 0) return [];

  const activeCategories = await Category.findAll({ where: { active: true }, attributes: ["slug"] });
  const validSlugs = new Set(activeCategories.map((c) => c.slug));

  return [...new Set(requested)]
    .filter((slug) => validSlugs.has(slug) && slug !== primaryCategory)
    .slice(0, 2);
}

module.exports = { sanitizeSecondaryCategories };