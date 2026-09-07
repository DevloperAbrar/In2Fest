const { sequelize } = require("../../config/database");
require("../models");
const { seedSuperAdmin } = require("./superAdmin.seeder");
const { seedPlans } = require("./plans.seeder");
const { seedWhatsappTemplates } = require("./whatsappTemplates.seeder");
const { seedCities } = require("./cities.seeder");
const { seedCategories } = require("./categories.seeder");

async function runSeeders() {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // ensure tables exist

    await seedSuperAdmin();
    await seedPlans();
    await seedWhatsappTemplates();
    await seedCities();
    await seedCategories();
    
    console.log("[SEED] All seeders completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("[SEED] Error running seeders:", error);
    process.exit(1);
  }
}

runSeeders();