module.exports = (sequelize, DataTypes) => {
  const WhatsappMessage = sequelize.define("WhatsappMessage", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    venue_id: DataTypes.UUID, // null if sent platform-wide by super admin without a specific venue
    recipient_phone: { type: DataTypes.STRING, allowNull: false },
    template_id: DataTypes.UUID,
    body: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM("scheduled", "sent", "delivered", "failed"),
      defaultValue: "scheduled"
    },
    scheduled_for: DataTypes.DATE,
    sent_at: DataTypes.DATE,
    trigger_type: {
      type: DataTypes.ENUM(
        "manual", "new_inquiry", "booking_confirmed", "invoice_shared",
        "payment_reminder", "review_request", "trial_expiry", "subscription_expired", "bulk",
        "marketplace_inquiry_to_vendor", "marketplace_inquiry_confirmation",
        "weekly_stats_vendor", "free_listing_nudge", "free_listing_registered",
        "free_listing_milestone", "free_listing_approved", "upgrade_link"
      ),
      defaultValue: "manual"
    }
  }, {
    tableName: "whatsapp_messages",
    indexes: [{ fields: ["venue_id"] }, { fields: ["status"] }]
  });

  return WhatsappMessage;
};