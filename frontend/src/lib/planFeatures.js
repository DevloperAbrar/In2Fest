// Keep in sync with backend/src/config/planFeatures.js
export const PLAN_FEATURES = [
  { key: "website_builder", label: "Website Builder", group: "common" },
  { key: "marketplace_profile", label: "Marketplace Profile", group: "common" },
  { key: "reviews", label: "Reviews", group: "common" },
  { key: "slots", label: "Slots", group: "common" },
  { key: "inquiries", label: "Inquiry Form", group: "common" },
  { key: "bookings", label: "Bookings", group: "common" },
  { key: "clients", label: "Clients", group: "common" },
  { key: "billing", label: "Billing", group: "common" },
  { key: "gym", label: "Gym Management", group: "gym", hint: "Members, plans, payments, leads" },
  { key: "gym_pro", label: "Gym Pro", group: "gym", hint: "Workouts, payment links, member card" },
  { key: "food", label: "Restaurant Suite", group: "food", hint: "Menu, live orders, QR, setup" },
  { key: "food_pro", label: "Restaurant Pro", group: "food", hint: "POS, stock, offers, customers, reports" }
];

export const PLAN_FEATURE_GROUPS = [
  { key: "common", label: "Common" },
  { key: "gym", label: "Gym & Fitness" },
  { key: "food", label: "Restaurant & Food" }
];