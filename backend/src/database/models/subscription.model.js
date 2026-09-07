module.exports = (sequelize, DataTypes) => {
    const Subscription = sequelize.define("Subscription", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      venue_id: { type: DataTypes.UUID, allowNull: false },
      plan_id: { type: DataTypes.UUID, allowNull: false },
      locked_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: "Price locked in at subscription time - never changes even if plan price changes later"
      },
      status: {
        type: DataTypes.ENUM("trial", "active", "expiring_soon", "expired", "suspended"),
        defaultValue: "trial"
      },
      trial_ends_at: DataTypes.DATE,
      current_period_start: DataTypes.DATE,
      current_period_end: DataTypes.DATE,
      razorpay_subscription_id: DataTypes.STRING
    }, {
      tableName: "subscriptions",
      indexes: [
        { fields: ["venue_id"] },
        { fields: ["status"] }
      ]
    });
  
    return Subscription;
  };