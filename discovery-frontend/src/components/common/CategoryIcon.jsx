import React from "react";

/**
 * CategoryIcon
 *
 * Props:
 *   slug  : string   - category slug (e.g. "marriage-hall", "photographer")
 *   size  : "sm" | "md" | "lg"   - controls wrapper size
 *   className : string  - extra classes on the wrapper
 */

const ICON_MAP = {
  "marriage-hall":   { emoji: "🏛️",  label: "Marriage Hall" },
  "banquet-hall":    { emoji: "🎪",  label: "Banquet Hall" },
  "party-lawn":      { emoji: "🌿",  label: "Party Lawn" },
  "farmhouse":       { emoji: "🏡",  label: "Farmhouse" },
  "photographer":    { emoji: "📷",  label: "Photographer" },
  "videographer":    { emoji: "🎥",  label: "Videographer" },
  "decorator":       { emoji: "🎨",  label: "Decorator" },
  "caterer":         { emoji: "🍽️",  label: "Caterer" },
  "dj":              { emoji: "🎧",  label: "DJ" },
  "makeup-artist":   { emoji: "💄",  label: "Makeup Artist" },
  "mehendi-artist":  { emoji: "🌸",  label: "Mehendi Artist" },
  "tent-house":      { emoji: "⛺",  label: "Tent House" },
  "sound-lighting":  { emoji: "💡",  label: "Sound & Lighting" },
  "card-printing":   { emoji: "🃏",  label: "Card Printing" },
  "horse-buggy":     { emoji: "🐴",  label: "Horse & Buggy" },
  "pandit-services": { emoji: "🙏",  label: "Pandit Services" },
  "travel-transport":{ emoji: "🚌",  label: "Travel & Transport" },
  "event-manager":   { emoji: "📋",  label: "Event Manager" },
};

const SIZE_CLASSES = {
  sm:  { wrapper: "w-8 h-8 text-base",  text: "text-xs" },
  md:  { wrapper: "w-12 h-12 text-2xl", text: "text-xs" },
  lg:  { wrapper: "w-16 h-16 text-3xl", text: "text-sm" },
};

export default function CategoryIcon({ slug, size = "md", showLabel = false, className = "" }) {
  const entry = ICON_MAP[slug] || { emoji: "🎉", label: slug };
  const sizeConfig = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div
        className={`${sizeConfig.wrapper} rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center`}
        title={entry.label}
        aria-label={entry.label}
      >
        <span role="img" aria-hidden="true">{entry.emoji}</span>
      </div>
      {showLabel && (
        <span className={`${sizeConfig.text} text-gray-600 text-center leading-tight`}>
          {entry.label}
        </span>
      )}
    </div>
  );
}

/**
 * Helper  - get just the emoji for a slug (useful in badges / cards)
 */
export function getCategoryEmoji(slug) {
  return ICON_MAP[slug]?.emoji || "🎉";
}

/**
 * Helper  - get the human label for a slug
 */
export function getCategoryLabel(slug) {
  return ICON_MAP[slug]?.label || slug?.replace(/-/g, " ");
}