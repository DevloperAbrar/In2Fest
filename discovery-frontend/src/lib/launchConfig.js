import { Dumbbell, BookOpen, Store, UtensilsCrossed, PartyPopper, Clock } from "lucide-react";

/**
 * Single source of truth for "what is live on In2Fest".
 *
 * LIVE_GROUPS is ordered by PRIORITY. A category belongs to the first group
 * whose matcher accepts it. Anything that matches no group is treated as
 * "Launching soon" everywhere in the UI (chip strip, categories page, filters).
 *
 * To launch a new vertical later (for example Clinics), add one entry here.
 * Categories added from the super admin panel are placed automatically, using
 * the business type the admin assigned (or the slug for gym-type categories).
 */

// Gym-type categories are matched by slug because Gym, Yoga, Sports, Dance and
// Academies all sit under the "health_wellness" business type together with
// Clinic and Salon, which are NOT live yet.
const GYM_SLUGS = ["gym-fitness", "yoga-center"];
const GYM_PATTERN =
  /(gym|fitness|yoga|sport|dance|zumba|martial|karate|taekwondo|boxing|swim|cricket|football|badminton|skating|aerobic|crossfit|academy)/i;

export const LIVE_GROUPS = [
  {
    key: "gym",
    title: "Gym, Sports & Fitness",
    shortLabel: "Gym",
    tagline: "Gyms, yoga, sports, dance and academies",
    icon: Dumbbell,
    tint: "#FFE6D6",
    ink: "#e8192c",
    order: ["gym-fitness", "yoga-center"],
    matches: (c) =>
      GYM_SLUGS.includes(c.slug) ||
      (["health_wellness", "general"].includes(c.businessType) && GYM_PATTERN.test(c.slug)),
  },
  {
    key: "library",
    title: "Libraries & Study Rooms",
    shortLabel: "Library",
    tagline: "Seats, shifts and monthly fees",
    icon: BookOpen,
    tint: "#DDF3E8",
    ink: "#0f8a5f",
    order: ["study-library"],
    matches: (c) => c.slug === "study-library" || c.businessType === "library",
  },
  {
    key: "shops",
    title: "Shops & Retail",
    shortLabel: "Shops",
    tagline: "Stores with stock, prices and WhatsApp orders",
    icon: Store,
    tint: "#FFE0E3",
    ink: "#e8192c",
    order: [
      "kirana-store",
      "clothing-store",
      "footwear-store",
      "electronics-store",
      "mobile-shop",
      "pharmacy",
      "stationery-store",
    ],
    matches: (c) => c.businessType === "retail",
  },
  {
    key: "food",
    title: "Food & Restaurants",
    shortLabel: "Food",
    tagline: "Restaurants, cafes, bakeries and cloud kitchens",
    icon: UtensilsCrossed,
    tint: "#FFF0C2",
    ink: "#d38a10",
    order: ["restaurant", "bakery-sweets", "cloud-kitchen", "food-court", "restaurant-franchise", "small-hotel"],
    matches: (c) => c.businessType === "food",
  },
  {
    key: "events",
    title: "Events & Weddings",
    shortLabel: "Events",
    tagline: "Venues, photographers, decorators and more",
    icon: PartyPopper,
    tint: "#E0EAFF",
    ink: "#3a5bd9",
    order: [
      "marriage-hall",
      "banquet-hall",
      "party-lawn",
      "farmhouse",
      "photographer",
      "videographer",
      "decorator",
      "caterer",
      "dj",
      "event-manager",
      "wedding-planner",
      "makeup-artist",
      "mehendi-artist",
      "tent-house",
      "sound-lighting",
      "card-printing",
      "horse-buggy",
      "pandit-services",
      "travel-transport",
      "singer",
    ],
    matches: (c) => c.businessType === "events",
  },
];

export const SOON_GROUP = {
  key: "soon",
  title: "Launching soon",
  shortLabel: "Soon",
  tagline: "We are onboarding these businesses right now",
  icon: Clock,
  tint: "#F3F1EC",
  ink: "#8a90a2",
};

/** Adds groupKey / isLive / rank to a normalised category. */
export function annotateCategory(cat, index = 0) {
  const group = LIVE_GROUPS.find((g) => g.matches(cat)) || null;
  const pos = group ? group.order.indexOf(cat.slug) : -1;
  return {
    ...cat,
    groupKey: group ? group.key : SOON_GROUP.key,
    isLive: !!group,
    // Known slugs follow the order above; unknown ones follow the admin display order.
    rank: pos === -1 ? 1000 + index : pos,
  };
}

function groupPriority(groupKey) {
  const i = LIVE_GROUPS.findIndex((g) => g.key === groupKey);
  return i === -1 ? LIVE_GROUPS.length : i;
}

/** Live groups first (in priority order), then everything that is launching soon. */
export function sortByPriority(list) {
  return [...list].sort(
    (a, b) => groupPriority(a.groupKey) - groupPriority(b.groupKey) || a.rank - b.rank
  );
}

/** [{ group, items }] for live groups only, in priority order, skipping empty groups. */
export function buildLiveGroups(list) {
  return LIVE_GROUPS.map((group) => ({
    group,
    items: list.filter((c) => c.groupKey === group.key),
  })).filter((g) => g.items.length > 0);
}