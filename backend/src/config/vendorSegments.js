// Vendor segments = the product groups we sell to. A segment decides which dashboard
// modules (plan features) and which sidebar entries (nav keys) a vendor sees.
// Keys in `modules` are PLAN_FEATURES keys. Keys in `nav` are `navKey`s in ownerSidebarItems.js.
const MODULE_NAV = {
  website_builder: "website", marketplace_profile: "marketplace", reviews: "reviews",
  slots: "slots", inquiries: "inquiries", bookings: "bookings", clients: "clients",
  billing: "billing", gym: "gym", food: "food"
};

const ALWAYS_NAV = ["dashboard", "settings"];
const COMMON_NAV = ["website", "marketplace", "reviews", "referrals", "analytics"];

const EVENT_BASE = ["website_builder", "marketplace_profile", "reviews", "inquiries", "bookings", "clients", "billing"];

const SEGMENTS = {
  venues: {
    key: "venues",
    label: "Venues & Celebration Spaces",
    categories: ["marriage-hall", "banquet-hall", "party-lawn", "farmhouse"],
    modules: [...EVENT_BASE, "slots"],
    nav: [...ALWAYS_NAV, "inquiries", "bookings", "slots", "clients", "billing", ...COMMON_NAV]
  },
  photography_films: {
    key: "photography_films",
    label: "Photography & Films",
    categories: ["photographer", "videographer", "makeup-artist", "mehendi-artist"],
    modules: [...EVENT_BASE, "slots"],
    nav: [...ALWAYS_NAV, "inquiries", "bookings", "slots", "clients", "billing", ...COMMON_NAV]
  },
  decor_production: {
    key: "decor_production",
    label: "Decor & Production",
    categories: ["decorator", "sound-lighting", "tent-house"],
    modules: [...EVENT_BASE, "slots"],
    nav: [...ALWAYS_NAV, "inquiries", "bookings", "slots", "clients", "billing", ...COMMON_NAV]
  },
  food_entertainment: {
    key: "food_entertainment",
    label: "Food & Entertainment",
    categories: ["caterer", "dj"],
    modules: EVENT_BASE,
    nav: [...ALWAYS_NAV, "inquiries", "bookings", "clients", "billing", ...COMMON_NAV]
  },
  planning_travel: {
    key: "planning_travel",
    label: "Planning & Travel",
    categories: ["event-manager", "travel-transport", "horse-buggy", "pandit-services", "card-printing"],
    modules: EVENT_BASE,
    nav: [...ALWAYS_NAV, "inquiries", "bookings", "clients", "billing", ...COMMON_NAV]
  },
  gym: {
    key: "gym",
    label: "Gym & Fitness",
    categories: ["gym-fitness"],
    modules: ["website_builder", "marketplace_profile", "reviews", "inquiries", "gym"],
    nav: [...ALWAYS_NAV, "gym", "inquiries", "website", "marketplace", "reviews", "referrals"]
  },
  shop: {
    key: "shop",
    label: "Shops & Retail",
    categories: ["clothing-store", "footwear-store", "mobile-shop", "pharmacy", "kirana-store", "electronics-store", "stationery-store"],
    modules: ["website_builder", "marketplace_profile", "reviews", "inquiries", "clients", "billing"],
    nav: [...ALWAYS_NAV, "inquiries", "catalog", "inventory", "orders", "billing", ...COMMON_NAV]
  },
  education: {
    key: "education",
    label: "Coaching, Schools & Training",
    categories: ["coaching-institute", "school", "tuition-teacher", "play-school", "skill-training"],
    modules: ["website_builder", "marketplace_profile", "reviews", "inquiries", "clients", "billing"],
    nav: [...ALWAYS_NAV, "inquiries", "clients", "billing", ...COMMON_NAV]
  },
  food: {
    key: "food",
    label: "Restaurants & Food Businesses",
    categories: ["restaurant", "cloud-kitchen", "bakery-sweets", "food-court", "restaurant-franchise", "small-hotel"],
    modules: ["website_builder", "marketplace_profile", "reviews", "inquiries", "food"],
    nav: [...ALWAYS_NAV, "food", "food_orders", "food_pos", "food_menu", "inquiries", "website", "marketplace", "reviews", "referrals"]
  }
};

const SEGMENT_BY_CATEGORY = {};
Object.values(SEGMENTS).forEach((seg) => seg.categories.forEach((slug) => { SEGMENT_BY_CATEGORY[slug] = seg; }));

// Returns null for categories that are not in a segment (they keep the old business-type behaviour).
// modulesForSlug(slug) supplies the modules of a secondary category that has no segment.
function resolveSegment(primarySlug, secondarySlugs = [], modulesForSlug = () => []) {
  const primary = SEGMENT_BY_CATEGORY[primarySlug];
  if (!primary) return null;

  const modules = new Set(primary.modules);
  const nav = new Set(primary.nav);
  (secondarySlugs || []).forEach((slug) => {
    const seg = SEGMENT_BY_CATEGORY[slug];
    if (seg) {
      seg.modules.forEach((m) => modules.add(m));
      seg.nav.forEach((n) => nav.add(n));
    } else {
      (modulesForSlug(slug) || []).forEach((m) => {
        modules.add(m);
        if (MODULE_NAV[m]) nav.add(MODULE_NAV[m]);
      });
    }
  });
  ALWAYS_NAV.forEach((n) => nav.add(n));

  return { segment: { key: primary.key, label: primary.label }, modules: [...modules], nav: [...nav] };
}

module.exports = { SEGMENTS, SEGMENT_BY_CATEGORY, resolveSegment };