// Custom WhatsApp templates and a light "who did I message" log.
// Standalone (like the inventory module) so the shared models/index.js is not touched.
const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const { UUID, UUIDV4, STRING, TEXT } = DataTypes;
const pk = () => ({ type: UUID, defaultValue: UUIDV4, primaryKey: true });

const GymMessageTemplate = sequelize.define("GymMessageTemplate", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  title: { type: STRING(80), allowNull: false },
  category: { type: STRING(20), allowNull: false, defaultValue: "custom" },
  body: { type: TEXT, allowNull: false }
}, { tableName: "gym_message_templates", indexes: [{ fields: ["venue_id"] }] });

// One row each time the vendor taps "Send on WhatsApp" for a person.
const GymMessageLog = sequelize.define("GymMessageLog", {
  id: pk(),
  venue_id: { type: UUID, allowNull: false },
  recipient_type: { type: STRING(10), allowNull: false }, // member | lead
  recipient_id: { type: UUID, allowNull: false },
  name: STRING(100),
  phone: STRING(15),
  label: STRING(80),
  sent_by: STRING(80)
}, {
  tableName: "gym_message_logs",
  updatedAt: false,
  indexes: [{ fields: ["venue_id"] }, { fields: ["recipient_id"] }]
});

async function ensure() {
  await GymMessageTemplate.sync();
  await GymMessageLog.sync();
}

module.exports = { GymMessageTemplate, GymMessageLog, ensure };