const { getSequelize } = require("./db");
const { setDynamicCategoryTypes, registerCategoryTypeRefresher } = require("../config/businessTypes");

// Loads slug -> business_type from the categories table into the in-memory registry
// used by getBusinessTypeKey(). Called at startup, after every admin category change,
// and automatically in the background (see TTL in config/businessTypes.js).
async function refreshCategoryTypes() {
  const sequelize = getSequelize();
  const [rows] = await sequelize.query("SELECT slug, business_type FROM categories");
  setDynamicCategoryTypes(rows);
  return rows.length;
}

registerCategoryTypeRefresher(refreshCategoryTypes);

module.exports = { refreshCategoryTypes };