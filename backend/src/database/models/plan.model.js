module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define("Plan", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    monthly_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    // Base yearly price. NULL = monthly_price * 12.
    yearly_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    // Discount applied on top of BOTH monthly and yearly price while the offer is active.
    discount_percent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 90 }
    },
    offer_name: { type: DataTypes.STRING, allowNull: true }, // e.g. "Diwali Sale"
    offer_ends_at: { type: DataTypes.DATE, allowNull: true }, // NULL = no expiry
    features: { type: DataTypes.JSONB, defaultValue: [] },
    trial_days: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: "plans"
  });

  return Plan;
};