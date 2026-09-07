module.exports = (sequelize, DataTypes) => {
    const ReviewRequest = sequelize.define("ReviewRequest", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      venue_id: DataTypes.UUID,
      booking_id: DataTypes.UUID,
      customer_phone: DataTypes.STRING,
      whatsapp_message_id: DataTypes.STRING,
      review_token: { type: DataTypes.STRING, unique: true },
      sent_at: DataTypes.DATE,
      review_submitted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
      tableName: "review_requests",
      updatedAt: false
    });
  
    return ReviewRequest;
  };