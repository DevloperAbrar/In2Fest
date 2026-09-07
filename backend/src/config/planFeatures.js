// Canonical list of gate-able features. Keys are permanent  - used in Plan.features (DB)
// and in route/middleware checks. Never rename a key; only add new ones.
const PLAN_FEATURES = [
  { key: "website_builder", label: "Website Builder" },
  { key: "marketplace_profile", label: "Marketplace Profile" },
  { key: "reviews", label: "Reviews" },
  { key: "slots", label: "Slots" },
  { key: "inquiries", label: "Inquiry Form" },
  { key: "bookings", label: "Bookings" },
  { key: "clients", label: "Clients" },
  { key: "billing", label: "Billing" }
];

module.exports = { PLAN_FEATURES };