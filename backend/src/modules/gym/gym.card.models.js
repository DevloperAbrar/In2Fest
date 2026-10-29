const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const GymCardSettings = sequelize.define("GymCardSettings", {
  venue_id: { type: DataTypes.UUID, primaryKey: true },
  config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
}, { tableName: "gym_card_settings" });

async function ensure() {
  await GymCardSettings.sync();
}

module.exports = { GymCardSettings, ensure };