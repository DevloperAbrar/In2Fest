import { getImageUrl } from "./constants";

// Optional local fallback photos: src/assets/categories/<slug>.jpg (or .webp / .png).
// An image uploaded by Super Admin always wins over these.
const localImages = import.meta.glob("../assets/categories/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default"
});

const bySlug = {};
Object.entries(localImages).forEach(([path, url]) => {
  const slug = path.split("/").pop().replace(/\.[^.]+$/, "");
  bySlug[slug] = url;
});

export function getCategoryImage(cat) {
  if (cat?.imageUrl) return getImageUrl(cat.imageUrl);
  return bySlug[cat?.slug] || null;
}

// Picks `n` categories spread across different business types (one from each in turn),
// so the hero pills show gym, clinic, caterer, tuition... not only one industry.
export function pickMixed(categories, n = 8) {
  const buckets = new Map();
  categories.forEach((c) => {
    const key = c.businessType || "general";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(c);
  });
  const lists = [...buckets.values()];
  const out = [];
  let i = 0;
  while (out.length < n && lists.some((l) => l.length > i)) {
    lists.forEach((l) => { if (l[i] && out.length < n) out.push(l[i]); });
    i += 1;
  }
  return out;
}