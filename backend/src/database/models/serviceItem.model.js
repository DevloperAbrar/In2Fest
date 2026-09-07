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
      description: DataTypes.STRING
    }, {
      tableName: "service_items",
      indexes: [{ fields: ["venue_id"] }]
    });
  
    return ServiceItem;
  };