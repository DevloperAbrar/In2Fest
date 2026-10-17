const { SECTION_TYPES, CATEGORY_SECTION_DEFAULTS, CATEGORY_SECTION_TITLES } = require("../config/sectionLibrary");
const { sanitizeSocialConfig } = require("./socialLinks");

// Fixed skeleton order for core sections when building fresh defaults.
const CORE_ORDER = ["hero", "about", "services", "gallery", "testimonials", "contact"];

function cloneDefaultConfig(type) {
  const def = SECTION_TYPES[type];
  if (!def || !def.defaultConfig) return null;
  return JSON.parse(JSON.stringify(def.defaultConfig));
}

function makeSection(type, categorySlug) {
  const config = cloneDefaultConfig(type);
  const title = CATEGORY_SECTION_TITLES[categorySlug]?.[type];
  if (config && title) config.title = title;
  return { type, visible: true, config };
}

// Builds a fresh, category-aware section list  - used for brand-new venues
// and as the fallback for legacy venues that have no page_sections saved yet.
// "stats" is placed right under the hero (numbers bar), everything else sits
// between services and the gallery.
function buildDefaultSections(categorySlug) {
  const optionalTypes = CATEGORY_SECTION_DEFAULTS[categorySlug] || CATEGORY_SECTION_DEFAULTS.default;

  const sections = [makeSection("hero", categorySlug)];
  if (optionalTypes.includes("stats") && SECTION_TYPES.stats) sections.push(makeSection("stats", categorySlug));
  sections.push(makeSection("about", categorySlug), makeSection("services", categorySlug));

  optionalTypes.forEach((type) => {
    if (SECTION_TYPES[type] && !sections.some((s) => s.type === type)) {
      sections.push(makeSection(type, categorySlug));
    }
  });

  sections.push(
    makeSection("gallery", categorySlug),
    makeSection("testimonials", categorySlug),
    makeSection("contact", categorySlug)
  );
  return sections;
}

// Sanitizes whatever is stored/submitted for page_sections:
// - drops unknown/removed section types (defensive against stale data)
// - drops duplicate types (keeps the first occurrence)
// - cleans the content of sections that hold links (social_links)
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

    let config =
      entry.config && typeof entry.config === "object"
        ? entry.config
        : cloneDefaultConfig(entry.type);

    if (entry.type === "social_links") {
      config = sanitizeSocialConfig(config);
    }

    cleaned.push({
      type: entry.type,
      visible: entry.visible !== false,
      config
    });
  });

  CORE_ORDER.forEach((type) => {
    if (!seen.has(type)) {
      cleaned.push(makeSection(type, venue.business_category));
      seen.add(type);
    }
  });

  return cleaned;
}

module.exports = { buildDefaultSections, normalizeSections, makeSection };