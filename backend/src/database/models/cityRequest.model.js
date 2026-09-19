module.exports = (sequelize, DataTypes) => {
    const CityRequest = sequelize.define(
      "CityRequest",
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        // Display value as typed by the visitor (e.g. "Chennai")
        city: { type: DataTypes.STRING(100), allowNull: false },
        // Normalised (lowercase, single-spaced) value used for grouping / de-duplication
        city_key: { type: DataTypes.STRING(100), allowNull: false },
        // Display value as typed (email or phone)
        contact: { type: DataTypes.STRING(150), allowNull: false },
        // Normalised value used for de-duplication
        contact_key: { type: DataTypes.STRING(150), allowNull: false },
        contact_type: {
          type: DataTypes.STRING(10),
          allowNull: false,
          validate: { isIn: [["phone", "email"]] }
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "pending",
          validate: { isIn: [["pending", "notified", "dismissed"]] }
        },
        notified_at: DataTypes.DATE
      },
      {
        tableName: "city_requests",
        indexes: [
          {
            unique: true,
            name: "city_requests_city_contact_unique",
            fields: ["city_key", "contact_key"]
          },
          { name: "city_requests_status_idx", fields: ["status"] }
        ]
      }
    );
  
    return CityRequest;
  };