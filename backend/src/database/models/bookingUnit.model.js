module.exports = (sequelize, DataTypes) => {
    const BookingUnit = sequelize.define("BookingUnit", {
      id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      booking_id: { type: DataTypes.UUID, allowNull: false },
      venue_id:   { type: DataTypes.UUID, allowNull: false },
      slot_id:    { type: DataTypes.UUID, allowNull: false },
      date:       { type: DataTypes.DATEONLY, allowNull: false },
      start_time: { type: DataTypes.TIME, allowNull: false },
      end_time:   { type: DataTypes.TIME, allowNull: false },
      units_used: { type: DataTypes.INTEGER, defaultValue: 1 }
    }, {
      tableName: "booking_units",
      updatedAt: false,
      indexes: [
        { fields: ["venue_id", "date"] },
        { fields: ["slot_id", "date"] },
        { fields: ["booking_id"] }
      ]
    });
    return BookingUnit;
  };