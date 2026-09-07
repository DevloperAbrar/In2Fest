const { Plan } = require("../models");

const DEFAULT_PLANS = [
  {
    name: "Free",
    description: "Get your own digital presence live  - free forever. Upgrade anytime for bookings, billing, and more.",
    monthly_price: 0,
    trial_days: 0,
    features: ["Public business page", "Basic inquiry form", "Marketplace listing"],
    is_active: true
  },
  {
    name: "Starter",
    description: "Perfect for a single venue getting started online.",
    monthly_price: 999,
    trial_days: 14,
    features: ["1 venue website", "Booking management", "Basic invoicing", "WhatsApp notifications"],
    is_active: true
  },
  {
    name: "Growth",
    description: "For venues that want full billing and analytics.",
    monthly_price: 1999,
    trial_days: 14,
    features: ["Everything in Starter", "GST invoicing", "Advanced analytics", "Team member accounts"],
    is_active: true
  },
  {
    name: "Pro",
    description: "For high-volume venues wanting priority support.",
    monthly_price: 3499,
    trial_days: 7,
    features: ["Everything in Growth", "Priority WhatsApp support", "Multiple templates"],
    is_active: true
  }
];

async function seedPlans() {
  for (const planData of DEFAULT_PLANS) {
    const existing = await Plan.findOne({ where: { name: planData.name } });
    if (!existing) {
      await Plan.create(planData);
      console.log(`[SEED] Plan created: ${planData.name}`);
    }
  }
}

module.exports = { seedPlans };