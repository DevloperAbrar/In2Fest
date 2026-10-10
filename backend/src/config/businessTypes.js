const { FIXED_CATEGORIES } = require("./categories");
const { PLAN_FEATURES } = require("./planFeatures");
const { resolveBilling } = require("./billingProfiles");

const ALL_MODULES = PLAN_FEATURES.map((f) => f.key);
const CORE_MODULES = ["website_builder", "marketplace_profile", "reviews", "inquiries", "clients", "billing"];
const APPOINTMENT_MODULES = [...CORE_MODULES, "slots", "bookings"];

const BASE_TERMS = {
  client: "Client", clients: "Clients",
  inquiry: "Inquiry", inquiries: "Inquiries",
  booking: "Booking", bookings: "Bookings",
  slot: "Slot", slots: "Slots",
  offering: "Service", offerings: "Services"
};

const BASE_BILLING = {
  docTypes: ["quotation", "invoice", "proforma", "credit_note"],
  docLabels: { quotation: "Quotation", invoice: "Invoice", proforma: "Proforma Invoice", credit_note: "Credit Note" },
  itemType: "service",
  units: ["nos", "hour", "day", "month", "service"],
  defaultUnit: "nos",
  defaultGstRate: 18,
  taxCodeLabel: "SAC",
  roundOff: true,
  dueDays: 0,
  customFields: [],
  defaultTerms: ""
};

function billing(over = {}) {
  return { ...BASE_BILLING, ...over, docLabels: { ...BASE_BILLING.docLabels, ...(over.docLabels || {}) } };
}
function terms(over = {}) {
  return { ...BASE_TERMS, ...over };
}

const BUSINESS_TYPES = {
  events: {
    key: "events",
    label: "Events & Weddings",
    description: "Venues, decorators, photographers, caterers and other event vendors",
    icon: "party-popper",
    modules: ALL_MODULES,
    terms: terms(),
    billing: billing({
      units: ["event", "day", "hour", "plate", "piece"],
      defaultUnit: "event",
      customFields: [{ key: "event_date", label: "Event Date", type: "date" }],
      defaultTerms: "50% advance to confirm the booking. Balance to be paid before the event. Advance is non-refundable."
    })
  },

  education: {
    key: "education",
    label: "Education & Coaching",
    description: "Coaching institutes, schools, tutors and training centres",
    icon: "graduation-cap",
    modules: CORE_MODULES,
    terms: terms({
      client: "Student", clients: "Students",
      inquiry: "Enquiry", inquiries: "Enquiries",
      booking: "Admission", bookings: "Admissions",
      slot: "Batch", slots: "Batches",
      offering: "Course", offerings: "Courses"
    }),
    billing: billing({
      docLabels: { invoice: "Fee Invoice", quotation: "Fee Quotation" },
      units: ["month", "term", "year", "course", "session"],
      defaultUnit: "month",
      defaultGstRate: 0,
      dueDays: 7,
      customFields: [
        { key: "student_name", label: "Student Name", type: "text" },
        { key: "batch", label: "Batch / Class", type: "text" },
        { key: "roll_no", label: "Roll / Admission No.", type: "text" }
      ],
      defaultTerms: "Fees once paid are non-refundable. Late fee may apply after the due date."
    })
  },

  retail: {
    key: "retail",
    label: "Retail & Shops",
    description: "Kirana, clothing, electronics, pharmacy, stationery and other shops",
    icon: "store",
    modules: CORE_MODULES,
    terms: terms({
      client: "Customer", clients: "Customers",
      inquiry: "Enquiry", inquiries: "Enquiries",
      booking: "Order", bookings: "Orders",
      offering: "Product", offerings: "Products"
    }),
    billing: billing({
      itemType: "product",
      units: ["pcs", "kg", "g", "ltr", "ml", "box", "pack", "dozen", "mtr"],
      defaultUnit: "pcs",
      taxCodeLabel: "HSN",
      defaultGstRate: 18,
      defaultTerms: "Goods once sold will not be taken back or exchanged without the bill."
    })
  },

  food: {
    key: "food",
    label: "Food & Restaurants",
    description: "Restaurants, bakeries, sweet shops and cloud kitchens",
    icon: "utensils",
    modules: APPOINTMENT_MODULES,
    terms: terms({
      client: "Customer", clients: "Customers",
      booking: "Reservation", bookings: "Reservations",
      slot: "Time Slot", slots: "Time Slots",
      offering: "Menu Item", offerings: "Menu Items"
    }),
    billing: billing({
      itemType: "product",
      units: ["plate", "pcs", "kg", "ltr", "portion"],
      defaultUnit: "plate",
      taxCodeLabel: "HSN",
      defaultGstRate: 5,
      defaultTerms: "Thank you for dining with us."
    })
  },

  health_wellness: {
    key: "health_wellness",
    label: "Health, Fitness & Beauty",
    description: "Gyms, salons, clinics and yoga centres",
    icon: "heart-pulse",
    modules: APPOINTMENT_MODULES,
    terms: terms({
      client: "Client", clients: "Clients",
      booking: "Appointment", bookings: "Appointments",
      slot: "Time Slot", slots: "Time Slots",
      offering: "Service", offerings: "Services"
    }),
    billing: billing({
      units: ["session", "month", "quarter", "year", "visit"],
      defaultUnit: "session",
      defaultGstRate: 18,
      customFields: [{ key: "membership_id", label: "Membership / File No.", type: "text" }],
      defaultTerms: "Fees are non-transferable. Packages expire as per the validity mentioned."
    })
  },

  professional: {
    key: "professional",
    label: "Professional Services",
    description: "CA, lawyers, consultants, freelancers and agencies",
    icon: "briefcase",
    modules: APPOINTMENT_MODULES,
    terms: terms({
      booking: "Appointment", bookings: "Appointments",
      slot: "Time Slot", slots: "Time Slots"
    }),
    billing: billing({
      units: ["hour", "day", "project", "month", "nos"],
      defaultUnit: "project",
      defaultGstRate: 18,
      dueDays: 15,
      customFields: [{ key: "project", label: "Project / Matter", type: "text" }],
      defaultTerms: "Payment due within the due date. Interest may be charged on delayed payments."
    })
  },

  home_services: {
    key: "home_services",
    label: "Home & Repair Services",
    description: "Repair, cleaning, electricians, plumbers and garages",
    icon: "wrench",
    modules: APPOINTMENT_MODULES,
    terms: terms({
      client: "Customer", clients: "Customers",
      inquiry: "Service Request", inquiries: "Service Requests",
      booking: "Job", bookings: "Jobs",
      slot: "Time Slot", slots: "Time Slots"
    }),
    billing: billing({
      units: ["job", "hour", "visit", "pcs", "sqft"],
      defaultUnit: "job",
      defaultGstRate: 18,
      customFields: [{ key: "reference_no", label: "Vehicle / Model / Ref No.", type: "text" }],
      defaultTerms: "Warranty on parts as per manufacturer. Service warranty 30 days."
    })
  },

  general: {
    key: "general",
    label: "Other Business",
    description: "Any other kind of business",
    icon: "building",
    modules: CORE_MODULES.concat(["bookings"]),
    terms: terms({ client: "Customer", clients: "Customers" }),
    billing: billing({
      units: ["nos", "pcs", "kg", "hour", "day", "service"],
      defaultUnit: "nos"
    })
  }
};

// New categories seeded automatically at startup (see database/startupMigrations.js).
const NEW_CATEGORIES = [
  // education
  { name: "Coaching Institute", slug: "coaching-institute", icon: "graduation-cap", business_type: "education" },
  { name: "School", slug: "school", icon: "school", business_type: "education" },
  { name: "Tuition Teacher", slug: "tuition-teacher", icon: "book-open", business_type: "education" },
  { name: "Play School", slug: "play-school", icon: "baby", business_type: "education" },
  { name: "Skill Training Centre", slug: "skill-training", icon: "laptop", business_type: "education" },
  // retail
  { name: "Kirana / General Store", slug: "kirana-store", icon: "shopping-basket", business_type: "retail" },
  { name: "Clothing Store", slug: "clothing-store", icon: "shirt", business_type: "retail" },
  { name: "Electronics Store", slug: "electronics-store", icon: "plug", business_type: "retail" },
  { name: "Mobile Shop", slug: "mobile-shop", icon: "smartphone", business_type: "retail" },
  { name: "Pharmacy", slug: "pharmacy", icon: "pill", business_type: "retail" },
  { name: "Stationery Store", slug: "stationery-store", icon: "pencil", business_type: "retail" },
  // food
  { name: "Restaurant / Cafe", slug: "restaurant", icon: "utensils-crossed", business_type: "food" },
  { name: "Bakery & Sweets", slug: "bakery-sweets", icon: "cake", business_type: "food" },
  { name: "Cloud Kitchen", slug: "cloud-kitchen", icon: "chef-hat", business_type: "food" },
  // health & wellness
  { name: "Gym & Fitness", slug: "gym-fitness", icon: "dumbbell", business_type: "health_wellness" },
  { name: "Salon & Spa", slug: "salon-spa", icon: "scissors", business_type: "health_wellness" },
  { name: "Clinic", slug: "clinic", icon: "stethoscope", business_type: "health_wellness" },
  { name: "Yoga Centre", slug: "yoga-center", icon: "flower", business_type: "health_wellness" },
  // professional
  { name: "CA / Accountant", slug: "ca-accountant", icon: "calculator", business_type: "professional" },
  { name: "Lawyer", slug: "lawyer", icon: "scale", business_type: "professional" },
  { name: "Consultant", slug: "consultant", icon: "briefcase", business_type: "professional" },
  // home services
  { name: "Repair Services", slug: "repair-services", icon: "wrench", business_type: "home_services" },
  { name: "Home Cleaning", slug: "home-cleaning", icon: "sparkle", business_type: "home_services" },
  { name: "Electrician & Plumber", slug: "electrician-plumber", icon: "zap", business_type: "home_services" },
  { name: "Auto Garage", slug: "auto-garage", icon: "car", business_type: "home_services" },
  // fallback
  { name: "Other Business", slug: "other-business", icon: "building", business_type: "general" }
];

// Static defaults baked into the code. At runtime the database column
// categories.business_type (set by Super Admin) wins; this map is only the fallback
// for categories whose DB value is still empty.
const CATEGORY_BUSINESS_TYPE = {};
FIXED_CATEGORIES.forEach((c) => { CATEGORY_BUSINESS_TYPE[c.slug] = "events"; });
NEW_CATEGORIES.forEach((c) => { CATEGORY_BUSINESS_TYPE[c.slug] = c.business_type; });

/* ------------------------------------------------------------------ */
/* Runtime registry (slug -> business type) loaded from the database   */
/* ------------------------------------------------------------------ */
const REGISTRY_TTL_MS = 60 * 1000;
let dynamicTypes = new Map();
let registryLoadedAt = 0;
let registryRefresher = null;

function isValidBusinessType(key) {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(BUSINESS_TYPES, key);
}

// Called by utils/categoryTypeCache.js with rows of { slug, business_type }.
function setDynamicCategoryTypes(rows) {
  const next = new Map();
  (rows || []).forEach((row) => {
    if (row && row.slug && isValidBusinessType(row.business_type)) {
      next.set(row.slug, row.business_type);
    }
  });
  dynamicTypes = next;
  registryLoadedAt = Date.now();
}

function registerCategoryTypeRefresher(fn) {
  registryRefresher = fn;
}

// Stays synchronous so existing callers (marketplaceSchemas, billing) need no change.
// When the registry is older than the TTL, a background refresh is kicked off.
function getBusinessTypeKey(categorySlug) {
  if (!categorySlug) return "general";

  if (registryRefresher && Date.now() - registryLoadedAt > REGISTRY_TTL_MS) {
    registryLoadedAt = Date.now(); // throttle: at most one refresh per window
    Promise.resolve()
      .then(registryRefresher)
      .catch(() => {});
  }

  return dynamicTypes.get(categorySlug) || CATEGORY_BUSINESS_TYPE[categorySlug] || "general";
}

// secondarySlugs (optional): a vendor running two lines of business gets the union of modules.
function getBusinessProfile(categorySlug, secondarySlugs = []) {
  const key = getBusinessTypeKey(categorySlug);
  const type = BUSINESS_TYPES[key] || BUSINESS_TYPES.general;
  const modules = new Set(type.modules);
  (secondarySlugs || []).forEach((slug) => {
    (BUSINESS_TYPES[getBusinessTypeKey(slug)]?.modules || []).forEach((m) => modules.add(m));
  });
  return {
    key: type.key,
    label: type.label,
    icon: type.icon,
    terms: type.terms,
    modules: [...modules],
    billing: resolveBilling(type.billing, type.key, categorySlug)
  };
}

module.exports = {
  BUSINESS_TYPES,
  NEW_CATEGORIES,
  CATEGORY_BUSINESS_TYPE,
  isValidBusinessType,
  setDynamicCategoryTypes,
  registerCategoryTypeRefresher,
  getBusinessTypeKey,
  getBusinessProfile
};