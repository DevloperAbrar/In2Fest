module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define("Booking", {
    id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    venue_id:   { type: DataTypes.UUID, allowNull: false },
    client_id:  { type: DataTypes.UUID, allowNull: false },
    inquiry_id: DataTypes.UUID,
    package_id: { type: DataTypes.UUID, allowNull: true },
    slot_id:    { type: DataTypes.UUID, allowNull: true },
    date_from:  { type: DataTypes.DATEONLY, allowNull: true },
    date_to:    { type: DataTypes.DATEONLY, allowNull: true },
    event_date: { type: DataTypes.DATEONLY, allowNull: true },
    start_time: { type: DataTypes.TIME, allowNull: true },
    end_time:   { type: DataTypes.TIME, allowNull: true },
    booking_items: { type: DataTypes.JSONB, defaultValue: [] },
    venue_type:    { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    event_type:    DataTypes.STRING,
    guest_count:   DataTypes.INTEGER,
    total_amount:    { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    amount_received: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    balance_pending: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    status: {
      type: DataTypes.ENUM("confirmed","in_progress","completed","cancelled"),
      defaultValue: "confirmed"
    },
    notes:     DataTypes.TEXT,
    documents: { type: DataTypes.JSONB, defaultValue: [] }
  }, {
    tableName: "bookings",
    indexes: [
      { fields: ["venue_id"] },
      { fields: ["date_from"] },
      { fields: ["event_date"] },
      { fields: ["status"] }
    ]
  });
  return Booking;
};