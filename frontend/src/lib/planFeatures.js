// Keep in sync with backend/src/config/planFeatures.js (gym_pro and food_pro are plan-only keys).
//
// pillar = which part of the product the feature belongs to:
//   found = marketplace listing, run = business tools, get = website.
// parent = a sub-feature that only makes sense with another module.
// segments = business types this feature makes sense for. No `segments` = every business type.
//   Used to hide features that do not apply (Gym Store on an Academy plan card).
// vendorLabel = how the vendor sees the feature (string, or { gym, academy, studio, default }).
//   The admin plan form always shows `label`.

export const PLAN_SEGMENTS = [
  { key: "gym", label: "Gym & Fitness" },
  { key: "academy", label: "Sports Academy" },
  { key: "studio", label: "Classes & Studios" },
  { key: "library", label: "Library & Study Room" }
];

const GYM_ENGINE = ["gym", "academy", "studio"];
// Gym, Academy, Studio and Library vendors do not get the general business suite (their menu has no
// Clients / Bookings / Slots / Billing page), so these features are hidden on their plan cards.
const NO_BUSINESS_SUITE = ["gym", "academy", "studio", "library"];

export const PLAN_FEATURES = [
  // Found it
  { key: "marketplace_profile", label: "Marketplace Profile", group: "common", pillar: "found", hint: "Listing on the In2Fest marketplace" },
  { key: "reviews", label: "Reviews", group: "common", pillar: "found", hint: "Verified customer reviews" },
  { key: "inquiries", label: "Inquiry Form", group: "common", pillar: "found", hint: "Direct customer inquiries" },

  // Run it
  // adminHidden = not offered on the plan form (none of the 4 sign-up business types uses it).
  // A plan that already has the feature still shows it ticked, so the admin can untick it.
  { key: "clients", label: "Clients", group: "common", pillar: "run", adminHidden: true, hideFor: NO_BUSINESS_SUITE, hint: "Customer records" },
  { key: "bookings", label: "Bookings", group: "common", pillar: "run", adminHidden: true, hideFor: NO_BUSINESS_SUITE },
  { key: "slots", label: "Slots", group: "common", pillar: "run", adminHidden: true, hideFor: NO_BUSINESS_SUITE, hint: "Live booking calendar" },
  { key: "billing", label: "Billing", group: "common", pillar: "run", adminHidden: true, hideFor: NO_BUSINESS_SUITE, hint: "Invoices, quotations, GST" },
  {
    key: "gym", label: "Gym, Academy & Studio Management", group: "gym", pillar: "run",
    segments: GYM_ENGINE,
    hint: "Members / students, plans, payments, attendance, leads, messages",
    vendorLabel: {
      gym: "Members, plans & payments",
      academy: "Students, batches & fee plans",
      studio: "Members, classes & packages",
      default: "Members, plans & payments"
    }
  },
  {
    key: "gym_pro", label: "Gym Pro", group: "gym", pillar: "run", parent: "gym",
    segments: GYM_ENGINE,
    hint: "Payment links, member card",
    vendorLabel: "Payment links & member card"
  },
  {
    key: "gym_workouts", label: "Gym Workouts", group: "gym", pillar: "run", parent: "gym",
    segments: ["gym"],
    hint: "Exercises, workout plans, assign to members (Gym only)",
    vendorLabel: "Workout plans for members"
  },
  {
    key: "gym_store", label: "Gym Store", group: "gym", pillar: "run", parent: "gym",
    segments: ["gym"],
    hint: "Supplement store, POS, stock, invoices. Also sold as an add-on (Gym only)",
    vendorLabel: "Supplement store, POS & stock"
  },
  {
    key: "gym_body", label: "Body Measurement", group: "gym", pillar: "run", parent: "gym",
    segments: ["gym"],
    hint: "Body readings, progress charts, PDF report. Also sold as an add-on (Gym only)",
    vendorLabel: "Body measurement reports"
  },
  { key: "food", label: "Restaurant Suite", group: "food", pillar: "run", adminHidden: true, segments: ["food"], hint: "Menu, live orders, QR, setup" },
  { key: "food_pro", label: "Restaurant Pro", group: "food", pillar: "run", parent: "food", adminHidden: true, segments: ["food"], hint: "POS, stock, offers, customers, reports" },
  {
    key: "library", label: "Library Management", group: "library", pillar: "run",
    segments: ["library"],
    hint: "Halls, shifts, students, attendance, books",
    vendorLabel: "Seats, shifts & attendance"
  },

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
// gym_body and gym_store are NOT here on purpose: Body Measurement and Gym Store are sold separately as add-ons.
const RUN = ["gym", "gym_pro", "gym_workouts", "library"];

// One-click fill for Admin > Plans > New Plan. Edit the numbers here to change the defaults.
// segments: [] = the plan is shown to every business type.
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
      segments: [],
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
      segments: [],
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
      segments: [],
      features: [...FOUND, ...RUN, "website_builder"]
    }
  }
];

const defOf = (key) => PLAN_FEATURES.find((f) => f.key === key);

/**
 * Features of a plan that apply to one business type. Used on the vendor-facing plan cards.
 * Unknown business type (segmentKey empty) = show everything, same as before.
 */
export function featuresForSegment(featureKeys, segmentKey) {
  const keys = Array.isArray(featureKeys) ? featureKeys : [];
  if (!segmentKey) return keys;
  return keys.filter((key) => {
    const def = defOf(key);
    if (!def) return true;
    if (def.hideFor && def.hideFor.includes(segmentKey)) return false;
    if (!def.segments) return true;
    return def.segments.includes(segmentKey);
  });
}

/** Vendor-facing wording of a feature, or null when the feature has no special wording. */
export function vendorFeatureLabel(key, segmentKey) {
  const def = defOf(key);
  if (!def || !def.vendorLabel) return null;
  if (typeof def.vendorLabel === "string") return def.vendorLabel;
  return def.vendorLabel[segmentKey] || def.vendorLabel.default || null;
}

/** "Gym & Fitness, Sports Academy" or "All business types". */
export function segmentsText(segments) {
  const list = Array.isArray(segments) ? segments : [];
  if (list.length === 0) return "All business types";
  return list.map((k) => PLAN_SEGMENTS.find((s) => s.key === k)?.label || k).join(", ");
}

/**
 * Features that make sense for a vendor's business type.
 * `modules` comes from the business profile (useBusinessProfile().profile.modules).
 * Pass segmentKey (profile.segment.key) too, so an Academy does not get gym-only features.
 */
export function getRelevantFeatures(modules, segmentKey) {
  if (!modules) return [];
  const set = new Set(modules);
  return PLAN_FEATURES.filter(
    (f) =>
      set.has(f.parent || f.key) &&
      (!segmentKey || !f.segments || f.segments.includes(segmentKey)) &&
      (!segmentKey || !f.hideFor || !f.hideFor.includes(segmentKey))
  );
}

/**
 * Features the owner can hand to a team member:
 * they must fit the business type AND be included in the current plan.
 */
export function getAssignableFeatures({ modules, planFeatures, segmentKey }) {
  const plan = new Set(planFeatures || []);
  return getRelevantFeatures(modules, segmentKey).filter((f) => plan.has(f.key));
}