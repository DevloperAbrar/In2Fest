module.exports = (sequelize, DataTypes) => {
  const Slot = sequelize.define("Slot", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    venue_id: { type: DataTypes.UUID, allowNull: false },

    name: { type: DataTypes.STRING, allowNull: false },

    // time_slot : named window (Morning 11–2, Evening 6–10)
    // full_day  : all-day flat rate, no specific times
    // hourly    : price × hours, min/max hours enforced
    // package   : bundle with description & inclusions
    pricing_type: {
      type: DataTypes.ENUM("time_slot", "full_day", "hourly", "package"),
      defaultValue: "time_slot",
      allowNull: false
    },

    // time_slot / full_day fields
    start_time: { type: DataTypes.TIME, allowNull: true },
    end_time:   { type: DataTypes.TIME, allowNull: true },
    base_price: DataTypes.DECIMAL(10, 2),
    weekend_price: DataTypes.DECIMAL(10, 2),
    days_of_operation: {
      type: DataTypes.JSONB,
      defaultValue: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    },

    // hourly fields
    price_per_hour: DataTypes.DECIMAL(10, 2),
    min_hours: DataTypes.INTEGER,
    max_hours: DataTypes.INTEGER,

    // package fields
    duration_label: DataTypes.STRING,
    description:    DataTypes.TEXT,
    inclusions:     { type: DataTypes.JSONB, defaultValue: [] },

    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: "slots",
    indexes: [{ fields: ["venue_id"] }]
  });

  return Slot;
};