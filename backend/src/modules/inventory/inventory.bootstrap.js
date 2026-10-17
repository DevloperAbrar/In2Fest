// Creates the shop inventory tables. startupMigrations.js requires this file at server start.
const { StockMovement, Supplier, Purchase } = require("./inventory.models");

async function ensureInventorySchema() {
  for (const model of [Supplier, Purchase, StockMovement]) await model.sync();
}

module.exports = { ensureInventorySchema };