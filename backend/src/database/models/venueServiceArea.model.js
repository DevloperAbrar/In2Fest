module.exports = (sequelize, DataTypes) => {
    const VenueServiceArea = sequelize.define("VenueServiceArea", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      venue_id: { type: DataTypes.UUID, allowNull: false },
      city_id: { type: DataTypes.INTEGER, allowNull: false }
    }, {
      tableName: "venue_service_areas",
      updatedAt: false
    });
  
    return VenueServiceArea;
  };