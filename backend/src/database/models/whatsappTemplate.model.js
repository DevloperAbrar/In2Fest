module.exports = (sequelize, DataTypes) => {
    const WhatsappTemplate = sequelize.define("WhatsappTemplate", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: { type: DataTypes.STRING, allowNull: false },
      category: {
        type: DataTypes.ENUM(
          "festival_greeting", "renewal_reminder", "payment_receipt",
          "feature_announcement", "trial_expiry", "custom"
        ),
        defaultValue: "custom"
      },
      body_template: { type: DataTypes.TEXT, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, {
      tableName: "whatsapp_templates"
    });
  
    return WhatsappTemplate;
  };