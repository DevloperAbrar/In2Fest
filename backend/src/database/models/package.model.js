module.exports = (sequelize, DataTypes) => {
    const Package = sequelize.define("Package", {
      id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      venue_id:    { type: DataTypes.UUID, allowNull: false },
      name:        { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      price:       { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      slot_ids:    { type: DataTypes.JSONB, defaultValue: [] },
      is_active:   { type: DataTypes.BOOLEAN, defaultValue: true }
    }, {
      tableName: "packages",
      indexes: [{ fields: ["venue_id"] }]
    });
    return Package;
  };