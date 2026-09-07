module.exports = (sequelize, DataTypes) => {
    const PaymentLedger = sequelize.define("PaymentLedger", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      booking_id: { type: DataTypes.UUID, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      type: {
        type: DataTypes.ENUM("advance", "balance", "refund"),
        defaultValue: "advance"
      },
      method: DataTypes.STRING,
      reference_number: DataTypes.STRING,
      paid_at: { type: DataTypes.DATE, allowNull: false },
      recorded_by: DataTypes.UUID
    }, {
      tableName: "payment_ledgers",
      indexes: [{ fields: ["booking_id"] }]
    });
  
    return PaymentLedger;
  };