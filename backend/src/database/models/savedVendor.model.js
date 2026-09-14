module.exports = (sequelize, DataTypes) => {
    const SavedVendor = sequelize.define("SavedVendor", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      public_user_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      venue_id: {
        type: DataTypes.UUID,
        allowNull: false
      }
    }, {
      tableName: "saved_vendors",
      indexes: [
        { unique: true, fields: ["public_user_id", "venue_id"] },
        { fields: ["public_user_id"] }
      ]
    });
  
    return SavedVendor;
  };