module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define("Payment", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    venue_id: { type: DataTypes.UUID, allowNull: false },
    // `amount` = total actually paid (incl. GST) — kept for backward compat
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    method: {
      type: DataTypes.STRING(30),
      allowNull: false
      // values: razorpay | cashfree | upi_manual | cash_manual | bank_transfer | credit
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
    recorded_by: DataTypes.UUID,

    // --- GST / referral breakdown (nullable for old rows) ---
    base_amount:     { type: DataTypes.DECIMAL(10, 2) }, // plan price pre-discount
    discount_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    credit_used:     { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    gst_rate:        { type: DataTypes.DECIMAL(5, 2),  defaultValue: 0 },
    gst_amount:      { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total_amount:    { type: DataTypes.DECIMAL(10, 2) }, // same as amount for new rows
    referral_id:     { type: DataTypes.UUID }
  }, {
    tableName: "payments",
    indexes: [{ fields: ["venue_id"] }]
  });

  return Payment;
};