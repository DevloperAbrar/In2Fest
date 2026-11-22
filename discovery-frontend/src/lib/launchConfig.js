import { Dumbbell, BookOpen, Trophy, Music, Clock } from "lucide-react";

/**
 * Display settings for the 4 live groups on the marketplace.
 *
 * WHICH categories are live, hidden or soon is decided in Super Admin > Categories
 * (Launch status + Group). It arrives from the API as launch_status / launch_group.
 *   live   - shown in groups, menu, filters, home page
 *   hidden - not shown anywhere, but existing vendors' pages keep working
 *   soon   - not listed (the categories page shows one "more categories soon" line)
 *
 * LIVE_GROUPS is ordered by PRIORITY (Library is last on purpose).
 * To add a new group later, add one entry here and one in backend config/launchGroups.js.
 */
export const LIVE_GROUPS = [
  {
    key: "gym",
    title: "Gym & Fitness",
    shortLabel: "Gym",
    tagline: "Gyms and fitness studios",
    icon: Dumbbell,
    tint: "#FFE6D6",
    ink: "#e8192c",
    order: ["gym-fitness"],
  },
  {
    key: "sports",
    title: "Sports Academy",
    shortLabel: "Sports",
    tagline: "Cricket, football, badminton, swimming and more",
    icon: Trophy,
    tint: "#E0EAFF",
    ink: "#3a5bd9",
    order: ["academy"],
  },
  {
    key: "studios",
    title: "Classes & Studios",
    shortLabel: "Studios",
    tagline: "Dance, music, art, yoga and martial arts",
    icon: Music,
    tint: "#FFF0C2",
    ink: "#d38a10",
    order: ["yoga-studio"],
  },
  {
    key: "library",
    title: "Library & Study Room",
    shortLabel: "Library",
    tagline: "Seats, shifts and monthly fees",
    icon: BookOpen,
    tint: "#DDF3E8",
    ink: "#0f8a5f",
    order: ["study-library"],
  },
];

export const SOON_GROUP = {
  key: "soon",
  title: "Launching soon",
  shortLabel: "Soon",
  tagline: "More categories are on the way",
  icon: Clock,
  tint: "#F3F1EC",
  ink: "#8a90a2",
};

// Used only if the API did not send launch_status / launch_group (for example an old cached response).
const LEGACY_LIVE = {
  "gym-fitness": "gym",
  academy: "sports",
  "yoga-studio": "studios",
  "yoga-center": "studios",
  "study-library": "library",
};

/** Adds groupKey / isLive / isSoon / isHidden / rank to a normalised category. */
export function annotateCategory(cat, index = 0) {
  const status = cat.launchStatus || (LEGACY_LIVE[cat.slug] ? "live" : "hidden");
  const groupKey = cat.launchGroup || LEGACY_LIVE[cat.slug] || null;
  const group = status === "live" ? LIVE_GROUPS.find((g) => g.key === groupKey) || null : null;
  const pos = group ? group.order.indexOf(cat.slug) : -1;
  const isSoon = !group && status === "soon";
  return {
    ...cat,
    groupKey: group ? group.key : isSoon ? SOON_GROUP.key : "hidden",
    isLive: !!group,
    isSoon,
    isHidden: !group && !isSoon,
    // Known slugs follow the order above; others follow the admin display order.
    rank: pos === -1 ? 1000 + index : pos,
  };
}

function groupPriority(groupKey) {
  const i = LIVE_GROUPS.findIndex((g) => g.key === groupKey);
  return i === -1 ? LIVE_GROUPS.length : i;
}

/** Live groups first (in priority order), then everything else. */
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