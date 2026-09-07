const { VENUE_CATEGORY_SLUGS } = require("../config/categories");

const CHECKLISTS = {
  venue: [
    "AC hall", "Open lawn", "Parking", "Generator backup", "Bridal room",
    "In-house catering", "Outside catering allowed", "DJ allowed",
    "In-house decoration", "External decoration allowed", "Stage and mandap",
    "Sound system", "Projector", "CCTV", "Security", "Valet parking"
  ],
  photographer: [
    "Candid photography", "Traditional photography", "Pre-wedding shoot",
    "Drone", "Same-day edit", "Photo album", "Reels", "Live streaming"
  ],
  videographer: [
    "Candid photography", "Traditional photography", "Pre-wedding shoot",
    "Drone", "Same-day edit", "Photo album", "Reels", "Live streaming"
  ],
  decorator: [
    "Floral decoration", "LED lighting", "Theme decoration", "Stage setup",
    "Entrance decor", "Table decoration", "Backdrop", "Balloon decoration", "Mandap decoration"
  ],
  caterer: [
    "Vegetarian only", "Non-vegetarian", "Jain food", "South Indian",
    "Chinese and continental", "Live counters", "Crockery", "Serving staff"
  ],
  dj: [
    "Indoor sound", "Outdoor sound", "LED wall", "DJ console",
    "Lighting effects", "Fog machine", "Anchor", "Generator"
  ],
  "makeup-artist": [
    "Bridal makeup", "Party makeup", "Airbrush", "Hair styling",
    "Mehendi", "Pre-bridal packages", "Trial session", "Home visits"
  ],
  // Default fallback for categories not explicitly covered in the spec yet
  // (mehendi-artist, tent-house, sound-lighting, card-printing, horse-buggy,
  // pandit-services, travel-transport, event-manager)
  default: [
    "Home visits / on-location service", "Advance booking required",
    "Custom packages available", "Outstation service"
  ]
};

function getChecklistForCategory(categorySlug) {
  if (VENUE_CATEGORY_SLUGS.includes(categorySlug)) return CHECKLISTS.venue;
  return CHECKLISTS[categorySlug] || CHECKLISTS.default;
}

module.exports = { getChecklistForCategory, CHECKLISTS };