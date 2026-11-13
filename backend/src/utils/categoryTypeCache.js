const { getSequelize } = require("./db");
const { setDynamicCategoryTypes, registerCategoryTypeRefresher } = require("../config/businessTypes");
const { setDynamicCategorySegments } = require("../config/vendorSegments");

// Loads slug -> business_type (and slug -> segment) from the categories table into the
// in-memory registries. Called at startup, after every admin category change,
// and automatically in the background (see TTL in config/businessTypes.js).
async function refreshCategoryTypes() {
  const sequelize = getSequelize();
  let rows;
  try {
    [rows] = await sequelize.query("SELECT slug, business_type, segment FROM categories");
  } catch (e) {
    // 42703 = column does not exist yet (migration has not run). Old behaviour still works.
    const code = e?.original?.code || e?.parent?.code;
    if (code !== "42703") throw e;
    [rows] = await sequelize.query("SELECT slug, business_type FROM categories");
  }
  setDynamicCategoryTypes(rows);
  setDynamicCategorySegments(rows);
  return rows.length;
}

registerCategoryTypeRefresher(refreshCategoryTypes);

module.exports = { refreshCategoryTypes };