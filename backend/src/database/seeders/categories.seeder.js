const { Category } = require("../models");
const { FIXED_CATEGORIES } = require("../../config/categories");

async function seedCategories() {
  for (let i = 0; i < FIXED_CATEGORIES.length; i++) {
    const cat = FIXED_CATEGORIES[i];
    const existing = await Category.findOne({ where: { slug: cat.slug } });
    if (!existing) {
      await Category.create({ ...cat, display_order: i + 1 });
      console.log(`[SEED] Category created: ${cat.name}`);
    }
  }
}

module.exports = { seedCategories };