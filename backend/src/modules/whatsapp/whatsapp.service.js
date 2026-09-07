const { whatsappClient } = require("../../config/whatsapp");
const { WhatsappMessage } = require("../../database/models");
const { getTemplateByCategory, renderTemplate } = require("./template.manager");
const env = require("../../config/env");

const TRIGGER_TO_CATEGORY = {
  new_inquiry: "custom",
  booking_confirmed: "custom",
  invoice_shared: "custom",
  payment_reminder: "custom",
  review_request: "custom",
  trial_expiry: "trial_expiry",
  subscription_expired: "renewal_reminder",
  bulk: "custom",
  // V2 additions
  marketplace_inquiry_to_vendor: "custom",
  marketplace_inquiry_confirmation: "custom",
  weekly_stats_vendor: "custom",
  free_listing_nudge: "custom",
  free_listing_registered: "custom",
  free_listing_milestone: "custom",
  free_listing_approved: "custom",
  upgrade_link: "custom"
};

const FALLBACK_MESSAGES = {
  new_inquiry: "New inquiry received from {{customerName}} for {{eventDate}}. Please respond soon.",
  booking_confirmed: "Hi {{customerName}}, your booking for {{eventDate}} is confirmed. Thank you!",
  invoice_shared: "Hi {{customerName}}, here is your invoice {{invoiceNumber}}: {{pdfLink}}",
  payment_reminder: "Hi {{customerName}}, a balance payment of ₹{{amount}} is pending for your booking.",
  review_request: "Hi {{customerName}}, thank you for celebrating with {{venueName}}. We'd love your feedback  - please take 2 minutes to share your experience: {{reviewLink}}",
  trial_expiry: "Your In2Fest trial ends in {{daysLeft}} days. Renew now to stay live.",
  subscription_expired: "Your In2Fest subscription has expired. Renew to restore dashboard access.",
  // V2 additions
  marketplace_inquiry_to_vendor: "You have a new inquiry from {{customerName}} for {{eventType}} on {{date}}. Open your dashboard to respond.",
  marketplace_inquiry_confirmation: "Your inquiry has been sent to {{venueName}}. They typically respond within {{responseTime}}.",
  weekly_stats_vendor: "Your In2Fest weekly stats: {{views}} profile views, {{inquiries}} inquiries received, {{reviews}} new reviews.",
  free_listing_nudge: "Hi {{name}}, your free listing on In2Fest got {{views}} views this month. Upgrade to full SaaS to manage bookings, send invoices, and get your own website: {{upgradeLink}}",
  free_listing_registered: "Hi {{name}}, thanks for registering on In2Fest! Your listing is under review and will go live shortly.",
  free_listing_milestone: "Hi {{name}}, your In2Fest listing just crossed {{views}} profile views! Consider upgrading to full SaaS to convert these views into bookings.",
  free_listing_approved: "Hi {{name}}, your listing is now live on In2Fest! View it here: {{listingLink}}",
  upgrade_link: "Hi {{name}}, here's your upgrade link to unlock the full In2Fest SaaS dashboard: {{paymentLink}}"
};

/**
 * The ONE function every feature in the platform must use to send WhatsApp messages.
 * Switching BSPs later means editing only this file.
 */
async function sendWhatsApp({ venueId = null, recipientPhone, triggerType = "manual", variables = {}, scheduledFor = null }) {
  // This function is called fire-and-forget from many places (booking/inquiry/listing
  // services). It must NEVER throw or reject  - a WhatsApp failure should never be able
  // to crash the server or break the request that triggered it. Every path below is
  // wrapped so the worst outcome is a null return + a console error.
  try {
    if (!recipientPhone) {
      console.warn("[WHATSAPP] No recipient phone provided, skipping send.");
      return null;
    }

    if (!TRIGGER_TO_CATEGORY[triggerType]) {
      console.error(`[WHATSAPP] Unknown triggerType "${triggerType}"  - not in TRIGGER_TO_CATEGORY. Message not sent.`);
      return null;
    }

    const category = TRIGGER_TO_CATEGORY[triggerType];
    const dbTemplate = await getTemplateByCategory(category).catch(() => null);
    const bodyTemplate = dbTemplate ? dbTemplate.body_template : FALLBACK_MESSAGES[triggerType] || "";
    const body = renderTemplate(bodyTemplate, variables);

    const message = await WhatsappMessage.create({
      venue_id: venueId,
      recipient_phone: recipientPhone,
      template_id: dbTemplate ? dbTemplate.id : null,
      body,
      status: scheduledFor ? "scheduled" : "sent",
      scheduled_for: scheduledFor,
      trigger_type: triggerType
    });

    if (scheduledFor) {
      return message; // picked up later by message.scheduler.js
    }

    try {
      if (!env.whatsapp.apiKey || !env.whatsapp.apiUrl) {
        console.warn("[WHATSAPP] BSP not configured  - message logged but not actually sent.");
        return message;
      }

      await whatsappClient.post("/send", {
        apiKey: env.whatsapp.apiKey,
        destination: recipientPhone,
        message: body
      });

      message.status = "delivered";
      message.sent_at = new Date();
      await message.save();
    } catch (sendError) {
      message.status = "failed";
      await message.save().catch(() => {});
      console.error("[WHATSAPP] Send failed:", sendError.message);
    }

    return message;
  } catch (error) {
    // Catches DB errors (e.g. enum mismatch), template errors, anything unexpected.
    console.error(`[WHATSAPP] sendWhatsApp failed for triggerType "${triggerType}":`, error.message);
    return null;
  }
}

module.exports = { sendWhatsApp };