module.exports = (sequelize, DataTypes) => {
  const ServiceItem = sequelize.define("ServiceItem", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    venue_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    default_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    description: DataTypes.STRING,
    item_type: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "service" }, // service | product
    unit: DataTypes.STRING(20),
    hsn_sac: DataTypes.STRING(10),
    tax_rate: DataTypes.DECIMAL(5, 2),
    sku: DataTypes.STRING(50),
    track_stock: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    stock_qty: DataTypes.DECIMAL(12, 2),
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, {
    tableName: "service_items",
    indexes: [{ fields: ["venue_id"] }]
  });

  return ServiceItem;
};