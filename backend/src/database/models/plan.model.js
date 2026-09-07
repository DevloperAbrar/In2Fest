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
      features: { type: DataTypes.JSONB, defaultValue: [] },
      trial_days: { type: DataTypes.INTEGER, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, {
      tableName: "plans"
    });
  
    return Plan;
  };