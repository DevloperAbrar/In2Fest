// Resolves the shared Sequelize instance regardless of how models/index exports it.
function getSequelize() {
    const models = require("../database/models");
    if (models.sequelize) return models.sequelize;
    const db = require("../config/database");
    return db.sequelize || db;
  }
  
  module.exports = { getSequelize };