// Creates the add-on tables and makes sure every add-on in the registry has a price row.
// startupMigrations.js requires this file at server start, so no manual migration is needed.
// New add-ons start switched OFF (is_active = false, price 0): nobody can see or buy them until
// the Super Admin sets a price and turns them on.
const { UniqueConstraintError } = require("sequelize");
const { AddonPrice, VenueAddon } = require("./addon.models");
const catalog = require("../../config/addonCatalog");

async function ensureAddonSchema() {
  await AddonPrice.sync();
  await VenueAddon.sync();
  for (const def of catalog.ADDONS) {
    try {
      await AddonPrice.findOrCreate({ where: { addon_key: def.key }, defaults: { monthly_price: 0, is_active: false } });
    } catch (e) {
      if (!(e instanceof UniqueConstraintError)) throw e; // two servers starting together: the other one created it
    }
  }
}

module.exports = { ensureAddonSchema };