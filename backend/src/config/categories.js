// These 18 slugs are permanent once the discovery marketplace goes live.
// Never rename or remove a slug here  - it breaks every indexed URL for that category.
const FIXED_CATEGORIES = [
    { name: "Marriage Hall", slug: "marriage-hall", icon: "building-2" },
    { name: "Banquet Hall", slug: "banquet-hall", icon: "landmark" },
    { name: "Party Lawn", slug: "party-lawn", icon: "trees" },
    { name: "Farmhouse", slug: "farmhouse", icon: "home" },
    { name: "Photographer", slug: "photographer", icon: "camera" },
    { name: "Videographer", slug: "videographer", icon: "video" },
    { name: "Decorator", slug: "decorator", icon: "flower-2" },
    { name: "Caterer", slug: "caterer", icon: "utensils" },
    { name: "DJ", slug: "dj", icon: "disc-3" },
    { name: "Makeup Artist", slug: "makeup-artist", icon: "sparkles" },
    { name: "Mehendi Artist", slug: "mehendi-artist", icon: "hand" },
    { name: "Tent House", slug: "tent-house", icon: "tent" },
    { name: "Sound & Lighting", slug: "sound-lighting", icon: "speaker" },
    { name: "Card Printing", slug: "card-printing", icon: "mail" },
    { name: "Horse & Buggy", slug: "horse-buggy", icon: "carrot" },
    { name: "Pandit Services", slug: "pandit-services", icon: "flame" },
    { name: "Travel & Transport", slug: "travel-transport", icon: "car" },
    { name: "Event Manager", slug: "event-manager", icon: "clipboard-list" }
  ];
  
  // Categories that get the shared "venue" services checklist (Section 5.4)
  const VENUE_CATEGORY_SLUGS = ["marriage-hall", "banquet-hall", "party-lawn", "farmhouse"];
  
  module.exports = { FIXED_CATEGORIES, VENUE_CATEGORY_SLUGS };