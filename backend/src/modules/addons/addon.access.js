// The ONE place that answers "which add-ons does this vendor have right now?".
// Used by utils/planAccess.js, so every feature gate in the app sees add-ons automatically.
const { Op } = require("sequelize");
const { VenueAddon } = require("./addon.models");
const catalog = require("../../config/addonCatalog");

const errCode = (e) => (e && ((e.parent && e.parent.code) || (e.original && e.original.code) || e.code)) || "";

// Keys of the add-ons that are live for a vendor right now (not expired, not cancelled).
async function activeAddonKeys(venueId, options = {}) {
  if (!venueId) return [];
  try {
    const rows = await VenueAddon.findAll({
      where: { venue_id: venueId, status: "active", ends_at: { [Op.gt]: new Date() } },
      attributes: ["addon_key"],
      raw: true,
      transaction: options.transaction
    });
    return rows.map((r) => r.addon_key).filter(catalog.isAddonKey);
  } catch (e) {
    if (errCode(e) === "42P01") return []; // table is created a moment after startup
    throw e;
  }
}

module.exports = { activeAddonKeys };