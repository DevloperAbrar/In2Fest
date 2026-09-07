// The full registry of website section types, and which optional ones each
// category gets by default. Mirrors the pattern in servicesChecklist.js  -
// keyed by category slug, with a "default" fallback for anything not listed
// (including categories added later via Category Manager).

const SECTION_TYPES = {
    // ---- Core sections  - content lives in dedicated Venue columns ----
    hero: {
      label: "Hero Banner",
      description: "Main banner image, heading, subheading and call-to-action",
      icon: "image",
      removable: false,
      toggleable: false // always shown  - a site needs a hero
    },
    about: {
      label: "About",
      description: "Your business story and highlights",
      icon: "info",
      removable: false,
      toggleable: true
    },
    services: {
      label: "Services / Offerings",
      description: "A simple list of services or amenities with icons",
      icon: "wrench",
      removable: false,
      toggleable: true
    },
    gallery: {
      label: "Gallery",
      description: "Photo gallery of your work or venue",
      icon: "images",
      removable: false,
      toggleable: true
    },
    testimonials: {
      label: "Testimonials",
      description: "Client reviews and testimonials",
      icon: "star",
      removable: false,
      toggleable: true
    },
    contact: {
      label: "Contact",
      description: "Contact details, address and enquiry form",
      icon: "phone",
      removable: false,
      toggleable: false // always shown  - a site needs a way to be contacted
    },
  
    // ---- Pluggable sections  - self-contained config JSON ----
    portfolio: {
      label: "Portfolio",
      description: "Showcase your best work with style or category tags",
      icon: "portfolio",
      removable: true,
      toggleable: true,
      itemFields: ["image_url", "title", "tag"],
      defaultConfig: { title: "Our Portfolio", items: [] }
    },
    packages: {
      label: "Packages",
      description: "Tiered pricing packages with what's included",
      icon: "packages",
      removable: true,
      toggleable: true,
      itemFields: ["title", "price", "description", "tag"],
      defaultConfig: { title: "Our Packages", items: [] }
    },
    process: {
      label: "How It Works",
      description: "A numbered, step-by-step walkthrough of your process",
      icon: "process",
      removable: true,
      toggleable: true,
      itemFields: ["title", "description"],
      defaultConfig: { title: "How It Works", items: [] }
    },
    faq: {
      label: "FAQs",
      description: "Frequently asked questions from your clients",
      icon: "faq",
      removable: true,
      toggleable: true,
      itemFields: ["title", "description"], // title = question, description = answer
      defaultConfig: { title: "Frequently Asked Questions", items: [] }
    },
    product_catalog: {
      label: "Product Catalog",
      description: "Product cards with image, name and price",
      icon: "catalog",
      removable: true,
      toggleable: true,
      itemFields: ["image_url", "title", "price", "description"],
      defaultConfig: { title: "Our Products", items: [] }
    },
    team: {
      label: "Team",
      description: "Team member cards with role and photo",
      icon: "team",
      removable: true,
      toggleable: true,
      itemFields: ["image_url", "title", "subtitle", "description"],
      defaultConfig: { title: "Meet the Team", items: [] }
    },
    occasions: {
      label: "Occasions We Cover",
      description: "Occasion type chips  - Wedding, Sangeet, Birthday...",
      icon: "occasions",
      removable: true,
      toggleable: true,
      itemFields: ["title"],
      defaultConfig: { title: "Occasions We Cover", items: [] }
    }
  };
  
  // Category slug -> ordered list of optional (pluggable) section types.
  // Core types are always added automatically  - don't list them here.
  const CATEGORY_SECTION_DEFAULTS = {
    "marriage-hall": ["packages", "faq"],
    "banquet-hall": ["packages", "faq"],
    "party-lawn": ["packages", "faq"],
    farmhouse: ["packages", "faq"],
    photographer: ["portfolio", "packages", "process", "faq"],
    videographer: ["portfolio", "packages", "process", "faq"],
    decorator: ["portfolio", "packages", "process", "faq"],
    caterer: ["packages", "process", "faq"],
    dj: ["packages", "process", "faq"],
    "makeup-artist": ["portfolio", "occasions", "packages", "faq"],
    "mehendi-artist": ["portfolio", "occasions", "packages", "faq"],
    "tent-house": ["packages", "process", "faq"],
    "sound-lighting": ["packages", "process", "faq"],
    "card-printing": ["product_catalog", "faq"],
    "horse-buggy": ["packages", "occasions", "faq"],
    "pandit-services": ["packages", "occasions", "faq"],
    "travel-transport": ["packages", "faq"],
    "event-manager": ["packages", "process", "team", "faq"],
    // Fallback for any category not listed above  - including new ones added
    // later through Category Manager.
    default: ["packages", "faq"]
  };
  
  module.exports = { SECTION_TYPES, CATEGORY_SECTION_DEFAULTS };