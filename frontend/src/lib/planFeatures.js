// Keep in sync with backend/src/config/planFeatures.js (gym_pro and food_pro are plan-only keys).
//
// pillar = which part of the product the feature belongs to:
//   found = marketplace listing, run = business tools, get = website.
// parent = a sub-feature that only makes sense with another module.
export const PLAN_FEATURES = [
  // Found it
  { key: "marketplace_profile", label: "Marketplace Profile", group: "common", pillar: "found", hint: "Listing on the In2Fest marketplace" },
  { key: "reviews", label: "Reviews", group: "common", pillar: "found", hint: "Verified customer reviews" },
  { key: "inquiries", label: "Inquiry Form", group: "common", pillar: "found", hint: "Direct customer inquiries" },

  // Run it
  { key: "clients", label: "Clients", group: "common", pillar: "run", hint: "Customer / student / member records" },
  { key: "bookings", label: "Bookings", group: "common", pillar: "run" },
  { key: "slots", label: "Slots", group: "common", pillar: "run", hint: "Live booking calendar" },
  { key: "billing", label: "Billing", group: "common", pillar: "run", hint: "Invoices, quotations, GST" },
  { key: "gym", label: "Gym Management", group: "gym", pillar: "run", hint: "Members, plans, payments, leads" },
  { key: "gym_pro", label: "Gym Pro", group: "gym", pillar: "run", parent: "gym", hint: "Workouts, payment links, member card" },
  { key: "food", label: "Restaurant Suite", group: "food", pillar: "run", hint: "Menu, live orders, QR, setup" },
  { key: "food_pro", label: "Restaurant Pro", group: "food", pillar: "run", parent: "food", hint: "POS, stock, offers, customers, reports" },
  { key: "library", label: "Library Management", group: "library", pillar: "run", hint: "Halls, shifts, students, attendance, books" },

  // Get it
  { key: "website_builder", label: "Website Builder", group: "common", pillar: "get", hint: "Own branded website" }
];

export const PLAN_FEATURE_GROUPS = [
  { key: "common", label: "Common" },
  { key: "gym", label: "Gym & Fitness" },
  { key: "food", label: "Restaurant & Food" },
  { key: "library", label: "Library & Study Rooms" }
];

export const PLAN_PILLARS = [
  { key: "found", title: "Found it · Marketplace listing", hint: "Customers discover the business on In2Fest." },
  {
    key: "run",
    title: "Run it · Business tools",
    hint: "Tick every tool. Each vendor only sees the tools that fit their own business type."
  },
  { key: "get", title: "Get it · Website", hint: "Branded website on the vendor's own subdomain." }
];

const FOUND = ["marketplace_profile", "reviews", "inquiries"];
const RUN = ["clients", "bookings", "slots", "billing", "gym", "gym_pro", "food", "food_pro", "library"];

// One-click fill for Admin > Plans > New Plan. Edit the numbers here to change the defaults.
export const PLAN_PRESETS = [
  {
    key: "free",
    label: "Free Listing",
    values: {
      name: "Free Listing",
      description: "A free listing on the In2Fest marketplace so customers can find you.",
      monthly_price: 0,
      yearly_price: "",
      trial_days: 0,
      discount_percent: 0,
      offer_name: "",
      features: ["marketplace_profile"]
    }
  },
  {
    key: "pro",
    label: "Pro",
    values: {
      name: "Pro",
      description: "Marketplace listing plus all the business tools for your type of business.",
      monthly_price: 500,
      yearly_price: 2998,
      trial_days: 5,
      discount_percent: 50,
      offer_name: "Launch Offer",
      gst_inclusive: true,
      features: [...FOUND, ...RUN]
    }
  },
  {
    key: "pro_website",
    label: "Pro + Website",
    values: {
      name: "Pro + Website",
      description: "Everything in Pro, plus your own branded website.",
      monthly_price: 800,
      yearly_price: 4000,
      trial_days: 5,
      discount_percent: 50,
      offer_name: "Launch Offer",
      gst_inclusive: true,
      features: [...FOUND, ...RUN, "website_builder"]
    }
  }
];

/**
 * Features that make sense for a vendor's business type.
 * `modules` comes from the business profile (useBusinessProfile().profile.modules).
 * A gym gets gym + gym_pro but never food or slots.
 */
export function getRelevantFeatures(modules) {
  if (!modules) return [];
  const set = new Set(modules);
  return PLAN_FEATURES.filter((f) => set.has(f.parent || f.key));
}

/**
 * Features the owner can hand to a team member:
 * they must fit the business type AND be included in the current plan.
 */
export function getAssignableFeatures({ modules, planFeatures }) {
  const plan = new Set(planFeatures || []);
  return getRelevantFeatures(modules).filter((f) => plan.has(f.key));
}