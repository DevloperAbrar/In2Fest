export const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "in2fest.com";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const BACKEND_URL = API_BASE_URL.replace("/api", ""); // e.g. http://localhost:5000

// hero_image_url / gallery paths come back from the API as relative paths
// (e.g. "/uploads/venues/xxx.png") because they're served by the backend,
// not this frontend. Prefix them so <img> requests hit the right origin.
export function getImageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  return `${BACKEND_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export const BRAND_NAME = "In2Fest";
export const BRAND_TAGLINE = "Find Verified Wedding and Event Vendors Near You";

// Alternate spellings people actually type into Google for this brand.
// Used in Organization schema (alternateName) and in a small piece of
// visible FAQ copy on the homepage, never repeated or stuffed anywhere else.
export const BRAND_VARIANTS = [
  "In2Fest",
  "I2F",
  "IntoFest",
  "In to Fest",
  "In Two Fest",
  "In 2 Fest"
];

// Single source of truth for every vendor category.
// label = what's shown to users and used in page titles/meta.
// aliases = real phrases people search for this category, used to build
// keyword-rich descriptions and, later, to power alias-aware search matching
// on the backend.
export const CATEGORIES = [
  { slug: "marriage-hall", label: "Marriage Hall", aliases: ["marriage hall", "wedding hall", "shaadi hall", "marriage lawn near me"] },
  { slug: "banquet-hall", label: "Banquet Hall", aliases: ["banquet hall", "banquet hall near me", "party hall", "function hall"] },
  { slug: "party-lawn", label: "Party Lawn", aliases: ["party lawn", "open lawn for wedding", "lawn for party near me"] },
  { slug: "farmhouse", label: "Farmhouse", aliases: ["farmhouse for party", "farmhouse near me", "party farmhouse booking"] },
  { slug: "photographer", label: "Wedding Photographer", aliases: ["wedding photographer near me", "best photographer for wedding", "candid wedding photographer"] },
  { slug: "videographer", label: "Wedding Videographer", aliases: ["wedding videographer", "cinematic wedding video maker", "wedding film maker near me"] },
  { slug: "decorator", label: "Wedding Decorator", aliases: ["wedding decorator near me", "stage decoration for wedding", "flower decoration for wedding"] },
  { slug: "caterer", label: "Caterer", aliases: ["wedding caterer near me", "catering service for shaadi", "best caterer for wedding"] },
  { slug: "dj", label: "DJ for Wedding", aliases: ["dj for wedding near me", "sangeet dj booking", "best dj for shaadi"] },
  { slug: "makeup-artist", label: "Bridal Makeup Artist", aliases: ["bridal makeup artist near me", "makeup artist for wedding", "best bridal makeup"] },
  { slug: "mehendi-artist", label: "Mehndi Artist", aliases: ["mehndi design", "mehndi artist near me", "bridal mehndi booking"] },
  { slug: "tent-house", label: "Tent House", aliases: ["tent near me", "tent house for wedding", "tent and decoration service"] },
  { slug: "sound-lighting", label: "Sound and Lighting", aliases: ["sound and light for wedding", "led lighting for shaadi", "dj sound system rental"] },
  { slug: "card-printing", label: "Wedding Card Printing", aliases: ["wedding card printing near me", "shaadi card design", "invitation card printing"] },
  { slug: "horse-buggy", label: "Horse and Buggy for Baraat", aliases: ["ghodi for baraat", "horse for wedding baraat", "buggy booking for baraat"] },
  { slug: "pandit-services", label: "Pandit Services", aliases: ["pandit for wedding near me", "pandit ji booking", "pooja pandit for shaadi"] },
  { slug: "travel-transport", label: "Travel and Transport", aliases: ["car rental for wedding", "guest transport for shaadi", "wedding car booking"] },
  { slug: "event-manager", label: "Event Management", aliases: ["event management", "event management company near me", "wedding event planner"] },
  { slug: "wedding-planner", label: "Wedding Planner", aliases: ["best shaadi planner", "wedding planner near me", "destination wedding planner"] },
  { slug: "singer", label: "Live Singer for Wedding", aliases: ["best singer for shaadi", "live singer for wedding near me", "sangeet singer booking"] }
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function getCategoryBySlug(slug) {
  return CATEGORIES.find((c) => c.slug === slug) || null;
}

export const SORT_OPTIONS = [
  { value: "relevant", label: "Most Relevant" },
  { value: "highest_rated", label: "Highest Rated" },
  { value: "price_low", label: "Price Low to High" },
  { value: "price_high", label: "Price High to Low" },
  { value: "newest", label: "Newest" }
];