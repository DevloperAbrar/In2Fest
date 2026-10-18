// Extra marketplace attributes for Phase 3 (events) and Phase 4 (catalogs, trust).
// "catalog" = a small table of rows, e.g. halls, packages, products, trainers, timetable.
// Stored inside venues.profile_attributes (JSONB), so no database change is needed.

const text = (key, label, extra = {}) => ({ key, label, type: "text", ...extra });
const num = (key, label, extra = {}) => ({ key, label, type: "number", ...extra });
const bool = (key, label, extra = {}) => ({ key, label, type: "boolean", ...extra });
const sel = (key, label, options, extra = {}) => ({ key, label, type: "select", options, ...extra });
const tags = (key, label, extra = {}) => ({ key, label, type: "tags", ...extra });
const catalog = (key, label, fields, extra = {}) => ({
  key, label, type: "catalog", fields, max: 20, display: "cards", ...extra
});

const VENUE = [
  num("veg_price_plate", "Veg price per plate", { group: "Pricing & halls", unit: "₹", min: 0, max: 100000 }),
  num("nonveg_price_plate", "Non-veg price per plate", { group: "Pricing & halls", unit: "₹", min: 0, max: 100000 }),
  num("rental_per_event", "Hall rental per event", { group: "Pricing & halls", unit: "₹", min: 0, max: 100000000 }),
  sel("music_cutoff", "Music / DJ cut-off time", ["9 PM", "10 PM", "11 PM", "12 AM", "No restriction"], { group: "Venue details" }),
  catalog("halls", "Halls & capacity", [
    text("name", "Hall / lawn name", { max: 60 }),
    num("seating", "Seating", { unit: "guests", max: 100000 }),
    num("floating", "Floating", { unit: "guests", max: 100000 }),
    bool("ac", "AC"),
    num("rental", "Rental", { unit: "₹", max: 100000000 })
  ], { group: "Pricing & halls", display: "table", max: 8 })
];

const PACKAGES = [
  catalog("packages", "Packages", [
    text("name", "Package name", { max: 60 }),
    num("price", "Price", { unit: "₹", max: 100000000 }),
    text("details", "What is included", { max: 160 })
  ], { group: "Packages", max: 8 })
];

const GYM = [
  tags("equipment", "Equipment & machines", { group: "Gym details", max: 8, placeholder: "e.g. Life Fitness treadmills" }),
  catalog("trainers", "Trainers", [
    text("name", "Trainer name", { max: 60 }),
    text("speciality", "Speciality", { max: 60 }),
    num("experience", "Experience", { unit: "yrs", max: 60 }),
    text("certification", "Certification", { max: 80 })
  ], { group: "Trainers & classes", max: 12 }),
  catalog("timetable", "Class timetable", [
    text("class", "Class", { max: 60 }),
    text("days", "Days", { max: 40 }),
    text("time", "Time", { max: 30 })
  ], { group: "Trainers & classes", display: "table", max: 20 })
];

const PRODUCTS = [
  catalog("products", "Featured products", [
    text("name", "Product", { max: 80 }),
    num("price", "Price", { unit: "₹", max: 100000000 }),
    text("unit", "Size / unit", { max: 30 }),
    text("brand", "Brand", { max: 40 }),
    bool("out_of_stock", "Out of stock")
  ], { group: "Products", max: 24 })
];

const FOOD_TRUST = [
  text("fssai_number", "FSSAI licence number", { group: "Trust & licences", max: 20 })
];

const EXTRA_ATTRIBUTES = {
  "marriage-hall": VENUE, "banquet-hall": VENUE, "party-lawn": VENUE, farmhouse: VENUE,
  photographer: PACKAGES, videographer: PACKAGES, caterer: PACKAGES, decorator: PACKAGES,
  dj: PACKAGES, "makeup-artist": PACKAGES, "mehendi-artist": PACKAGES,
  "gym-fitness": GYM,
  "kirana-store": PRODUCTS, "clothing-store": PRODUCTS, "electronics-store": PRODUCTS,
  "mobile-shop": PRODUCTS, "stationery-store": PRODUCTS,
  restaurant: FOOD_TRUST, "bakery-sweets": FOOD_TRUST, "cloud-kitchen": FOOD_TRUST
};

// Validates one catalog value submitted by a vendor.
function cleanCatalog(attr, value) {
  if (!Array.isArray(value)) return undefined;
  const fields = attr.fields || [];
  const primary = fields[0];
  if (!primary) return undefined;
  const max = attr.max || 20;
  const out = [];

  value.forEach((row) => {
    if (!row || typeof row !== "object" || out.length >= max) return;
    const clean = {};
    fields.forEach((f) => {
      const raw = row[f.key];
      if (f.type === "boolean") {
        if (raw === true || raw === "true") clean[f.key] = true;
        return;
      }
      if (f.type === "number") {
        if (raw === "" || raw === null || raw === undefined) return;
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0 && n <= (f.max || 100000000)) clean[f.key] = n;
        return;
      }
      const t = String(raw ?? "").trim().slice(0, f.max || 100);
      if (t) clean[f.key] = t;
    });
    if (clean[primary.key]) out.push(clean);
  });

  return out.length ? out : undefined;
}

module.exports = { EXTRA_ATTRIBUTES, cleanCatalog };