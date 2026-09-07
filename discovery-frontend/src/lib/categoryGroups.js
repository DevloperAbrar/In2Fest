import { Building2, Camera, Palette, Wand2, PartyPopper, Flame, Route, Sparkles } from "lucide-react";

/**
 * Groups every vendor category (from useCategories / the live meta API)
 * into sections for the /categories browse page. Deliberately carries no
 * per-group colour - every group and every category tile uses the same
 * two brand tones (neutral grey by default, accent red on hover/active)
 * that the rest of the app already uses, so this page reads as part of
 * the same product instead of introducing a new colour system.
 *
 * `slugs` maps to the live category slugs coming from the backend. Any
 * live category whose slug isn't listed in any group here still shows up,
 * bucketed into the trailing "More Categories" group built at render time -
 * so a category added later in the super admin panel is never dropped.
 */
export const CATEGORY_GROUPS = [
  {
    key: "venues",
    title: "Venues & Celebration Spaces",
    icon: Building2,
    slugs: ["marriage-hall", "banquet-hall", "party-lawn", "farmhouse", "tent-house"],
  },
  {
    key: "photography",
    title: "Photography & Films",
    icon: Camera,
    slugs: ["photographer", "videographer"],
  },
  {
    key: "decor",
    title: "Décor & Production",
    icon: Palette,
    slugs: ["decorator", "sound-lighting", "card-printing"],
  },
  {
    key: "beauty",
    title: "Beauty & Styling",
    icon: Wand2,
    slugs: ["makeup-artist", "mehendi-artist"],
  },
  {
    key: "food",
    title: "Food & Entertainment",
    icon: PartyPopper,
    slugs: ["caterer", "dj", "singer"],
  },
  {
    key: "rituals",
    title: "Rituals & Traditions",
    icon: Flame,
    slugs: ["horse-buggy", "pandit-services"],
  },
  {
    key: "planning",
    title: "Planning & Travel",
    icon: Route,
    slugs: ["event-manager", "wedding-planner", "travel-transport"],
  },
];

// Fallback bucket for any live category not covered above, so nothing from
// the super admin's category list ever silently disappears from this page.
export const OTHER_GROUP = {
  key: "more",
  title: "More Categories",
  icon: Sparkles,
  slugs: [],
};