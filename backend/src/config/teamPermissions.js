const { getBusinessProfile } = require("./businessTypes");

// Sub-features that only make sense together with a parent module.
const PARENT_MODULE = { gym_pro: "gym", food_pro: "food" };

// Every key a team member can be given.
const ASSIGNABLE_KEYS = [
  "website_builder",
  "marketplace_profile",
  "reviews",
  "slots",
  "inquiries",
  "bookings",
  "clients",
  "billing",
  "gym",
  "gym_pro",
  "food",
  "food_pro",
  "library"
];

/**
 * Permission keys that make sense for this venue's business type.
 * A gym never gets "food", a restaurant never gets "gym" or "slots", and so on.
 * Uses the same business profile the dashboard sidebar uses.
 */
function assignableKeysForVenue(venue) {
  const profile = getBusinessProfile(venue.business_category, venue.secondary_categories || []);
  const modules = new Set(profile.modules || []);
  return ASSIGNABLE_KEYS.filter((key) => modules.has(PARENT_MODULE[key] || key));
}

module.exports = { ASSIGNABLE_KEYS, assignableKeysForVenue };