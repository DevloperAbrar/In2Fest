const { WhatsappTemplate } = require("../models");

const DEFAULT_TEMPLATES = [
  {
    name: "New Inquiry Alert",
    category: "custom",
    body_template: "New inquiry received from {{customerName}} for {{eventDate}}. Please respond soon."
  },
  {
    name: "Trial Expiry Reminder",
    category: "trial_expiry",
    body_template: "Hi! Your In2Fest trial ends in {{daysLeft}} days. Renew now to keep your website live."
  },
  {
    name: "Renewal Reminder",
    category: "renewal_reminder",
    body_template: "Your In2Fest subscription needs renewal. Renew today to avoid dashboard access loss."
  },
  {
    name: "Payment Receipt",
    category: "payment_receipt",
    body_template: "Thank you {{customerName}}! We've received your payment of ₹{{amount}}."
  },
  {
    name: "Festival Greeting",
    category: "festival_greeting",
    body_template: "Wishing you and your venue a joyful festive season from the In2Fest team! 🎉"
  },
  {
    name: "Marketplace Inquiry To Vendor",
    category: "custom",
    body_template: "You have a new inquiry from {{customerName}} for {{eventType}} on {{date}}. Open your dashboard to respond."
  },
  {
    name: "Marketplace Inquiry Confirmation",
    category: "custom",
    body_template: "Your inquiry has been sent to {{venueName}}. They typically respond within {{responseTime}}."
  },
  {
    name: "Weekly Stats Vendor",
    category: "custom",
    body_template: "Your In2Fest weekly stats: {{views}} profile views, {{inquiries}} inquiries received, {{reviews}} new reviews."
  },
  {
    name: "Free Listing Upgrade Nudge",
    category: "custom",
    body_template: "Hi {{name}}, your free listing on In2Fest got {{views}} views this month. Upgrade to full SaaS to manage bookings, send invoices, and get your own website: {{upgradeLink}}"
  },
  {
    name: "Free Listing Milestone",
    category: "custom",
    body_template: "Hi {{name}}, your In2Fest listing just crossed {{views}} profile views! Consider upgrading to convert these views into bookings."
  }
];

async function seedWhatsappTemplates() {
  for (const template of DEFAULT_TEMPLATES) {
    const existing = await WhatsappTemplate.findOne({ where: { name: template.name } });
    if (!existing) {
      await WhatsappTemplate.create(template);
      console.log(`[SEED] WhatsApp template created: ${template.name}`);
    }
  }
}

module.exports = { seedWhatsappTemplates };