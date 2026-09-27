module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define("Payment", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    venue_id: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    method: {
      // "razorpay" kept for backward compatibility with any historical
      // rows from before the Cashfree migration — all new online
      // payments are recorded as "cashfree".
      type: DataTypes.ENUM("razorpay", "cashfree", "upi_manual", "cash_manual", "bank_transfer"),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("pending", "success", "failed", "refunded"),
      defaultValue: "pending"
    },
    plan_name_snapshot: DataTypes.STRING,
    period_covered_start: DataTypes.DATE,
    period_covered_end: DataTypes.DATE,
    cf_payment_id: DataTypes.STRING,
    cf_order_id: DataTypes.STRING,
    notes: DataTypes.TEXT,
    recorded_by: DataTypes.UUID
  }, {
    tableName: "payments",
    indexes: [{ fields: ["venue_id"] }]
  });

  return Payment;
};