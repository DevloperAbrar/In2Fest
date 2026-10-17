// Single source of truth for "which kind of website experience does this business get".
// gym / shop get their own hero, accent, dark mode, nav wording and section looks.
// Everything else (events, education, food...) keeps the classic venue experience.

export const PLATFORM_DEFAULT_COLOR = "#7c3aed";

const GYM_SLUGS = ["gym-fitness"];
const SHOP_SLUGS = [
  "clothing-store", "footwear-store", "mobile-shop", "pharmacy",
  "kirana-store", "electronics-store", "stationery-store"
];

export const VERTICALS = {
  gym: {
    key: "gym",
    accent: "#ef4444",
    darkDefault: true,
    // wording used in the navbar for sections whose public name differs from the builder name
    navLabels: { packages: "Membership", courses: "Programs", results: "Transformations", team: "Trainers" }
  },
  shop: {
    key: "shop",
    accent: "#059669",
    darkDefault: false,
    navLabels: { product_catalog: "Shop" }
  },
  venue: { key: "venue", accent: null, darkDefault: false, navLabels: {} }
};

// First matching category wins (primary category first, then secondary ones).
export function getVertical(venue) {
  const cats = [venue?.business_category, ...(venue?.secondary_categories || [])].filter(Boolean);
  for (const c of cats) {
    if (GYM_SLUGS.includes(c)) return VERTICALS.gym;
    if (SHOP_SLUGS.includes(c)) return VERTICALS.shop;
  }
  return VERTICALS.venue;
}

// If the vendor never changed the platform's default purple, use the vertical's own accent.
export function resolveAccent(venue, vertical) {
  const c = venue?.theme_color;
  if (vertical?.accent && (!c || c.toLowerCase() === PLATFORM_DEFAULT_COLOR)) return vertical.accent;
  return c || PLATFORM_DEFAULT_COLOR;
}

// Readable text colour for a button painted with `hex` (white on dark/medium colours,
// near-black on light ones like yellow or lime).
export function onAccent(hex) {
  const raw = String(hex || "").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return "#ffffff";
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.35 ? "#111827" : "#ffffff";
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function waDigits(venue) {
  const raw = String(venue?.whatsapp_number || venue?.phone || "").replace(/\D/g, "");
  return raw.length === 10 ? `91${raw}` : raw;
}

export function waLink(venue, text = "") {
  const d = waDigits(venue);
  if (!d) return null;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;