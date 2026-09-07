// CATEGORY_FIELD_CONFIG and COMMON_FIELDS stay static  - these define what
// form fields to show, not the category list itself.
export const CATEGORY_FIELD_CONFIG = {
  venue: {
    label: "Venue details",
    fields: [
      { name: "hall_name", label: "Venue Name", type: "text", required: true },
      { name: "address", label: "Full Address", type: "text", required: true },
      { name: "capacity", label: "Guest Capacity", type: "number", required: true },
      { name: "google_maps_link", label: "Google Maps Link", type: "text", required: false }
    ]
  },
  service: {
    label: "Business details",
    fields: [
      { name: "hall_name", label: "Business Name", type: "text", required: true },
      { name: "primary_locality", label: "Service Area / Locality", type: "text", required: true },
      { name: "team_size", label: "Team Size", type: "number", required: false },
      { name: "starting_price", label: "Starting Price (₹)", type: "number", required: false }
    ]
  }
};

export const COMMON_FIELDS = [
  { name: "owner_name", label: "Owner Name", type: "text", required: true },
  { name: "phone", label: "Phone Number", type: "text", required: true },
  { name: "city", label: "City", type: "text", required: true }
];

// These now take the live `categories` list (fetched from /meta/categories)
// instead of the old hardcoded VENDOR_CATEGORIES array, so any category
// added in Category Manager is picked up automatically everywhere.

function isVenueCategory(slug, categories) {
  const cat = categories.find((c) => c.slug === slug);
  return !!cat?.is_venue_type;
}

// A vendor can run multiple lines of business (e.g. Marriage Hall + Caterer).
// If ANY selected category is a physical "venue" (has an address/capacity),
// we show the venue field set  - a person with a hall AND a catering service
// still needs to fill in the venue's address and capacity.
export function getGroupForCategories(selectedSlugs, categories) {
  if (!selectedSlugs || selectedSlugs.length === 0 || !categories) return "service";
  const hasVenueGroup = selectedSlugs.some((slug) => isVenueCategory(slug, categories));
  return hasVenueGroup ? "venue" : "service";
}

// business_category (singular) drives the dashboard/public-page template,
// so we need one "primary" pick even when multiple are selected.
// Preference: the first physical venue-type category selected (since that
// decides layout most strongly), else just the first one selected.
export function getPrimaryCategory(selectedSlugs, categories) {
  if (!selectedSlugs || selectedSlugs.length === 0) return null;
  const venueSlug = selectedSlugs.find((slug) => isVenueCategory(slug, categories || []));
  return venueSlug || selectedSlugs[0];
}