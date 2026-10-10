// Single source of truth for the public website's navbar menu.
// Used by the Website Builder (to list the options) and by the public
// site (to build the real navbar).

// Desktop navbar shows this many links, the rest go under a "More" dropdown.
export const MAX_INLINE_NAV_LINKS = 6;

const FALLBACK_SECTIONS = ["hero", "about", "services", "gallery", "testimonials", "contact"].map(
  (type) => ({ type, visible: true })
);

// Core sections: fixed anchors that already exist in every template.
const CORE_NAV = {
  hero: { key: "home", anchor: "home", label: "Home" },
  about: { key: "about", anchor: "about", label: "About" },
  services: { key: "services", anchor: "services", label: "Services" },
  gallery: { key: "gallery", anchor: "gallery", label: "Gallery" },
  testimonials: { key: "testimonials", anchor: "testimonials", label: "Reviews" },
  contact: { key: "contact", anchor: "contact", label: "Contact" }
};

// Optional sections the vendor can add. Anchor is `section-<type>`
// (added by DynamicSectionRenderer). "packages" and "cta_banner" are not
// menu destinations, so they are left out on purpose.
const DYNAMIC_LABELS = {
  portfolio: "Portfolio",
  process: "How It Works",
  faq: "FAQs",
  product_catalog: "Products",
  team: "Team",
  occasions: "Occasions",
  courses: "Courses",
  menu: "Menu",
  hours: "Opening Hours",
  results: "Results"
};

function dynamicHasContent(section, venue) {
  const items = section.config?.items || [];
  if (section.type === "hours") {
    const bh = venue.business_hours;
    if (bh && bh.enabled === false) return false;
    return Boolean((bh && bh.days) || items.length);
  }
  return items.length > 0;
}

// Applies the vendor's saved order. Keys that are not in the saved order
// (e.g. a section added later) are appended at the end in their natural order.
function applyNavOrder(list, order) {
  if (!Array.isArray(order) || order.length === 0) return list;
  const pos = new Map(order.map((k, i) => [k, i]));
  const known = list
    .filter((c) => pos.has(c.key))
    .sort((a, b) => pos.get(a.key) - pos.get(b.key));
  const unknown = list.filter((c) => !pos.has(c.key));
  return [...known, ...unknown];
}

/**
 * All possible menu entries for this venue, in menu order.
 * strict = true (public site): drops sections that would render nothing.
 * strict = false (builder): lists everything the vendor has switched on.
 * ignoreOrder = true: natural page order (used for "Reset to default").
 */
export function getNavCandidates(venue, opts = {}) {
  if (!venue) return [];
  const { strict = false, slots, packages, ignoreOrder = false } = opts;

  const sections =
    Array.isArray(venue.page_sections) && venue.page_sections.length > 0
      ? venue.page_sections
      : FALLBACK_SECTIONS;

  const list = [];

  // These two render just above the Contact section on the public page.
  const pushSpecials = () => {
    if (venue.show_slots_packages !== false) {
      const hasOfferings =
        (slots || []).some((s) => s.is_active !== false) ||
        (packages || []).some((p) => p.is_active !== false);
      if (!strict || hasOfferings) {
        list.push({ key: "pricing", anchor: "pricing", label: "Slots & Packages", defaultShow: false });
      }
    }
    if (venue.show_availability !== false) {
      list.push({ key: "availability", anchor: "availability", label: "Availability", defaultShow: true });
    }
  };

  sections.forEach((section) => {
    if (!section || section.visible === false) return;

    if (section.type === "contact") pushSpecials();

    const core = CORE_NAV[section.type];
    if (core) {
      list.push({ key: core.key, anchor: core.anchor, label: core.label, defaultShow: true });
      return;
    }

    const label = DYNAMIC_LABELS[section.type];
    if (!label) return;
    if (strict && !dynamicHasContent(section, venue)) return;
    list.push({ key: section.type, anchor: `section-${section.type}`, label, defaultShow: false });
  });

  return ignoreOrder ? list : applyNavOrder(list, venue.nav_config?.order);
}

/** Effective on/off + custom label for one candidate, from venue.nav_config. */
export function getNavSetting(venue, candidate) {
  const row = venue?.nav_config?.items?.[candidate.key] || {};
  return {
    show: typeof row.show === "boolean" ? row.show : candidate.defaultShow,
    customLabel: typeof row.label === "string" ? row.label : ""
  };
}

/** Final navbar links for the public site (already in the vendor's order). */
export function resolveNav(venue, opts = {}) {
  return getNavCandidates(venue, { ...opts, strict: true })
    .map((c) => {
      const s = getNavSetting(venue, c);
      return { key: c.key, href: `#${c.anchor}`, label: s.customLabel || c.label, show: s.show };
    })
    .filter((i) => i.show)
    .map(({ key, href, label }) => ({ key, href, label }));
}