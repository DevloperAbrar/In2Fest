// Vendor segments decide which modules (plan features) and which sidebar entries (nav keys)
// a vendor sees. Keys in `modules` are PLAN_FEATURES keys.
// Keys in `nav` are `navKey`s in frontend/src/features/venue-owner/ownerSidebarItems.js.
const MODULE_NAV = {
  website_builder: "website", marketplace_profile: "marketplace", reviews: "reviews",
  slots: "slots", inquiries: "inquiries", bookings: "bookings", clients: "clients",
  billing: "billing", gym: "gym", food: "food", library: "library"
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
    nav: [...ALWAYS_NAV, "food", "inquiries", ...COMMON_NAV]
  },
  library: {
    key: "library",
    label: "Library & Study Rooms",
    categories: ["study-library"],
    modules: ["website_builder", "marketplace_profile", "reviews", "inquiries", "library"],
    nav: [...ALWAYS_NAV, "library", "inquiries", "website", "marketplace", "reviews", "referrals"]
  },
  // Generic events segment. No fixed categories: only categories created by Super Admin
  // with the "events" functionality land here (through categories.segment).
  events: {
    key: "events",
    label: "Events & Celebrations",
    categories: [],
    modules: [...EVENT_BASE, "slots"],
    nav: [...ALWAYS_NAV, "inquiries", "bookings", "slots", "clients", "billing", ...COMMON_NAV]
  }
};

const SEGMENT_BY_CATEGORY = {};
Object.values(SEGMENTS).forEach((seg) => seg.categories.forEach((slug) => { SEGMENT_BY_CATEGORY[slug] = seg; }));

// Functionality a Super Admin can give a NEW category (stored in categories.segment).
const ASSIGNABLE_SEGMENTS = ["gym", "shop", "food", "library", "events"];

/* Runtime registry: slug -> segment key, loaded from categories.segment
   (see utils/categoryTypeCache.js). Static segments above always win. */
let dynamicSegments = new Map();

function setDynamicCategorySegments(rows) {
  const next = new Map();
  (rows || []).forEach((row) => {
    if (row && row.slug && row.segment && ASSIGNABLE_SEGMENTS.includes(row.segment)) {
      next.set(row.slug, row.segment);
    }
  });
  dynamicSegments = next;
}

function segmentForCategory(slug) {
  if (!slug) return null;
  if (SEGMENT_BY_CATEGORY[slug]) return SEGMENT_BY_CATEGORY[slug];
  const key = dynamicSegments.get(slug);
  return key ? SEGMENTS[key] : null;
}

// True when ANY of the slugs belongs to the given segment (static or admin-assigned).
function categoriesInSegment(slugs, segmentKey) {
  return (slugs || []).filter(Boolean).some((slug) => {
    const seg = segmentForCategory(slug);
    return Boolean(seg) && seg.key === segmentKey;
  });
}

// Returns null for categories that are not in a segment (they keep the old business-type behaviour).
// modulesForSlug(slug) supplies the modules of a secondary category that has no segment.
function resolveSegment(primarySlug, secondarySlugs = [], modulesForSlug = () => []) {
  const primary = segmentForCategory(primarySlug);
  if (!primary) return null;

  const modules = new Set(primary.modules);
  const nav = new Set(primary.nav);
  (secondarySlugs || []).forEach((slug) => {
    const seg = segmentForCategory(slug);
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

module.exports = {
  SEGMENTS,
  SEGMENT_BY_CATEGORY,
  ASSIGNABLE_SEGMENTS,
  setDynamicCategorySegments,
  segmentForCategory,
  categoriesInSegment,
  resolveSegment
};