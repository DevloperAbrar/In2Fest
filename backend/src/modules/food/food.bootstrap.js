// Creates the food tables (CREATE TABLE IF NOT EXISTS via Model.sync). Called from startupMigrations.js.
// NOTE: sync() never alters an existing table. Future new columns need an ALTER statement in startupMigrations.
async function ensureFoodSchema() {
    const m = require("./food.models");
    const order = ["FoodSettings", "FoodCategory", "FoodUnit", "FoodItem", "FoodTable", "FoodOrder", "FoodCustomer", "FoodIngredient", "FoodStockLog"];
    for (const name of order) await m[name].sync();
  }
  
  module.exports = { ensureFoodSchema };