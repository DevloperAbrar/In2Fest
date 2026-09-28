module.exports = (sequelize, DataTypes) => {
    const Referral = sequelize.define("Referral", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      referrer_venue_id: { type: DataTypes.UUID, allowNull: false },
      referred_venue_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      status: {
        type: DataTypes.ENUM("pending", "available", "cancelled"),
        defaultValue: "pending"
      },
      first_payment_id: DataTypes.UUID,
      base_amount:   DataTypes.DECIMAL(10, 2),
      reward_percent: DataTypes.DECIMAL(5, 2),
      reward_amount:  DataTypes.DECIMAL(10, 2),
      available_at:  DataTypes.DATE
    }, {
      tableName: "referrals",
      indexes: [
        { fields: ["referrer_venue_id"] },
        { fields: ["status"] }
      ]
    });
  
    return Referral;
  };