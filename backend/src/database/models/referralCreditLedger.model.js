module.exports = (sequelize, DataTypes) => {
    const ReferralCreditLedger = sequelize.define("ReferralCreditLedger", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      venue_id:    { type: DataTypes.UUID, allowNull: false },
      type:        { type: DataTypes.STRING(20), allowNull: false }, // earn|spend|expire|reverse
      amount:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      referral_id: DataTypes.UUID,
      payment_id:  DataTypes.UUID,
      expires_at:  DataTypes.DATE,
      note:        DataTypes.TEXT
    }, {
      tableName: "referral_credit_ledger",
      indexes: [
        { fields: ["venue_id"] },
        { fields: ["expires_at"] }
      ]
    });
  
    return ReferralCreditLedger;
  };