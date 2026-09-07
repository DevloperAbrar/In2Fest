module.exports = (sequelize, DataTypes) => {
    const Inquiry = sequelize.define("Inquiry", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      venue_id: { type: DataTypes.UUID, allowNull: false },
      slot_id: DataTypes.UUID,
      customer_name: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: false },
      email: DataTypes.STRING,
      event_date: { type: DataTypes.DATEONLY, allowNull: false },
      event_type: DataTypes.STRING,
      guest_count: DataTypes.INTEGER,
      message: DataTypes.TEXT,
      source: { type: DataTypes.STRING, defaultValue: "subdomain" }, // 'subdomain' or 'marketplace'
      status: {
        type: DataTypes.ENUM(
          "new", "contacted", "negotiating", "advance_received",
          "confirmed", "completed", "cancelled", "lost"
        ),
        defaultValue: "new"
      },
      internal_notes: DataTypes.TEXT
    }, {
      tableName: "inquiries",
      indexes: [
        { fields: ["venue_id"] },
        { fields: ["status"] },
        { fields: ["event_date"] }
      ]
    });
  
    return Inquiry;
  };