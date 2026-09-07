const { SECTION_TYPES, CATEGORY_SECTION_DEFAULTS } = require("../config/sectionLibrary");

// Fixed skeleton order for core sections when building fresh defaults.
const CORE_ORDER = ["hero", "about", "services", "gallery", "testimonials", "contact"];

function cloneDefaultConfig(type) {
  const def = SECTION_TYPES[type];
  if (!def || !def.defaultConfig) return null;
  return JSON.parse(JSON.stringify(def.defaultConfig));
}

function makeSection(type) {
  return { type, visible: true, config: cloneDefaultConfig(type) };
}

// Builds a fresh, category-aware section list  - used for brand-new venues
// and as the fallback for legacy venues that have no page_sections saved yet.
function buildDefaultSections(categorySlug) {
  const optionalTypes = CATEGORY_SECTION_DEFAULTS[categorySlug] || CATEGORY_SECTION_DEFAULTS.default;

  const sections = [makeSection("hero"), makeSection("about"), makeSection("services")];

  optionalTypes.forEach((type) => {
    if (SECTION_TYPES[type] && !sections.some((s) => s.type === type)) {
      sections.push(makeSection(type));
    }
  });

  sections.push(makeSection("gallery"), makeSection("testimonials"), makeSection("contact"));
  return sections;
}

// Sanitizes whatever is stored/submitted for page_sections:
// - drops unknown/removed section types (defensive against stale data)
// - drops duplicate types (keeps the first occurrence)
// - guarantees every core type is present (appends any that are missing)
// - falls back to full category defaults if nothing usable is stored yet
function normalizeSections(venue) {
  const raw = Array.isArray(venue.page_sections) ? venue.page_sections : [];

  if (raw.length === 0) {
    return buildDefaultSections(venue.business_category);
  }

  const seen = new Set();
  const cleaned = [];

  raw.forEach((entry) => {
    if (!entry || typeof entry.type !== "string") return;
    if (!SECTION_TYPES[entry.type]) return;
    if (seen.has(entry.type)) return;

    seen.add(entry.type);
    cleaned.push({
      type: entry.type,
      visible: entry.visible !== false,
      config:
        entry.config && typeof entry.config === "object"
          ? entry.config
          : cloneDefaultConfig(entry.type)
    });
  });

  CORE_ORDER.forEach((type) => {
    if (!seen.has(type)) {
      cleaned.push(makeSection(type));
      seen.add(type);
    }
  });

  return cleaned;
}

module.exports = { buildDefaultSections, normalizeSections, makeSection };