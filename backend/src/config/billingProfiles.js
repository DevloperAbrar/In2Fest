// Central, config-driven billing behaviour.
// Resolution order (later wins):  BILLING_DEFAULTS -> businessTypes billing -> TYPE_BILLING[type] -> CATEGORY_BILLING[slug]
//
// To support a new kind of vendor, add an entry here. No UI code changes are needed.
//
// Fields:
//   docTypes          which documents the vendor can create
//   customerRequired  false = walk-in billing is allowed
//   paymentMode       "now"     -> amount received is pre-filled with the full total (counter sale)
//                     "advance" -> advance/deposit is collected on the bill
//                     "later"   -> pay-later, due date flow
//   showDueDate       show payment terms + due date
//   showTaxCode       show the HSN/SAC input per line
//   itemPlaceholder   hint text for the item name
//   extraCharges      one-tap charge buttons that add a line item
//   units/defaultUnit/customFields/defaultTerms/defaultGstRate/dueDays  (same as before)

const ALL_DOCS = ["quotation", "invoice", "proforma", "credit_note"];

const BILLING_DEFAULTS = {
  customerRequired: false,
  paymentMode: "later",
  showDueDate: true,
  showTaxCode: true,
  itemPlaceholder: "Item or service name",
  extraCharges: []
};

/* ---------------- per business type ---------------- */
const TYPE_BILLING = {
  events: {
    docTypes: ALL_DOCS,
    customerRequired: true,
    paymentMode: "advance",
    itemPlaceholder: "e.g. Hall rental, Catering, Decoration",
    extraCharges: ["Transport", "Labour", "Setup & decoration", "Generator / power backup"]
  },
  education: {
    docTypes: ["invoice", "quotation", "credit_note"],
    customerRequired: true,
    paymentMode: "later",
    showTaxCode: false,
    itemPlaceholder: "e.g. Class 10th fee",
    extraCharges: ["Admission fee", "Exam fee", "Study material", "Late fee"]
  },
  retail: {
    docTypes: ["invoice", "quotation", "credit_note"],
    paymentMode: "now",
    showDueDate: false,
    itemPlaceholder: "Product name",
    extraCharges: ["Packing", "Delivery"]
  },
  food: {
    docTypes: ["invoice", "credit_note"],
    paymentMode: "now",
    showDueDate: false,
    itemPlaceholder: "Menu item",
    extraCharges: ["Service charge", "Packing", "Delivery"]
  },
  health_wellness: {
    docTypes: ["invoice", "quotation", "credit_note"],
    customerRequired: true,
    paymentMode: "now",
    showDueDate: false,
    showTaxCode: false,
    itemPlaceholder: "e.g. Monthly membership",
    extraCharges: ["Registration fee", "Trainer fee"]
  },
  professional: {
    docTypes: ALL_DOCS,
    customerRequired: true,
    paymentMode: "later",
    itemPlaceholder: "e.g. Consultation, ITR filing",
    extraCharges: ["Out-of-pocket expenses", "Filing fee"]
  },
  home_services: {
    docTypes: ["quotation", "invoice", "credit_note"],
    customerRequired: true,
    paymentMode: "now",
    showDueDate: false,
    itemPlaceholder: "e.g. Labour, spare part",
    extraCharges: ["Visit charge", "Labour", "Spare parts", "Transport"]
  },
  general: {}
};

/* ---------------- per category (overrides the type) ---------------- */
const EVENT_DATE = { key: "event_date", label: "Event Date", type: "date" };
const VENUE_BILLING = {
  units: ["day", "event", "hour", "plate"],
  defaultUnit: "day",
  customFields: [EVENT_DATE, { key: "guest_count", label: "Guests", type: "text" }],
  itemPlaceholder: "e.g. Hall rental, Rooms",
  extraCharges: ["Cleaning charge", "Generator / power backup", "Security deposit", "Decoration"]
};
const PHOTO_BILLING = {
  units: ["event", "hour", "day", "album"],
  defaultUnit: "event",
  itemPlaceholder: "e.g. Wedding photography",
  extraCharges: ["Travel", "Extra hours", "Album & prints"]
};
const SOUND_BILLING = {
  units: ["event", "hour", "day"],
  defaultUnit: "event",
  extraCharges: ["Transport", "Extra hours", "Generator"]
};

const CATEGORY_BILLING = {
  // events
  "marriage-hall": VENUE_BILLING,
  "banquet-hall": VENUE_BILLING,
  "party-lawn": VENUE_BILLING,
  farmhouse: VENUE_BILLING,
  "tent-house": {
    units: ["piece", "set", "day", "sqft"],
    defaultUnit: "piece",
    itemPlaceholder: "e.g. Pandal, Chairs, Tables",
    extraCharges: ["Transport", "Labour", "Setup & installation", "Security deposit"]
  },
  caterer: {
    units: ["plate", "kg", "event"],
    defaultUnit: "plate",
    customFields: [EVENT_DATE, { key: "guest_count", label: "Guests", type: "text" }],
    itemPlaceholder: "e.g. Wedding menu (per plate)",
    extraCharges: ["Service charge", "Waiters / staff", "Transport"]
  },
  photographer: PHOTO_BILLING,
  videographer: PHOTO_BILLING,
  dj: SOUND_BILLING,
  "sound-lighting": SOUND_BILLING,
  decorator: {
    units: ["event", "piece", "sqft"],
    defaultUnit: "event",
    extraCharges: ["Transport", "Labour", "Setup & dismantling"]
  },

  // education
  school: {
    units: ["term", "month", "year"],
    defaultUnit: "term",
    customFields: [
      { key: "student_name", label: "Student Name", type: "text" },
      { key: "class", label: "Class / Section", type: "text" },
      { key: "roll_no", label: "Admission No.", type: "text" }
    ],
    extraCharges: ["Admission fee", "Transport fee", "Exam fee", "Late fee"]
  },
  "coaching-institute": {
    units: ["month", "term", "year", "course"],
    extraCharges: ["Admission fee", "Study material", "Test series", "Late fee"]
  },
  "tuition-teacher": {
    docTypes: ["invoice"],
    units: ["month", "session", "hour"],
    defaultUnit: "month",
    extraCharges: ["Registration fee", "Study material"]
  },

  // retail
  pharmacy: {
    units: ["strip", "pcs", "box", "bottle"],
    defaultUnit: "strip",
    customFields: [{ key: "doctor_name", label: "Doctor / Prescription", type: "text" }]
  },
  "mobile-shop": {
    units: ["pcs"],
    defaultUnit: "pcs",
    customFields: [{ key: "imei", label: "IMEI / Serial No.", type: "text" }],
    extraCharges: ["Accessories", "Activation / setup"]
  },
  "clothing-store": { units: ["pcs", "set", "mtr"], defaultUnit: "pcs" },
  "bakery-sweets": { units: ["kg", "pcs", "box", "dozen"], defaultUnit: "kg" },

  // health & wellness
  "gym-fitness": {
    units: ["month", "quarter", "year", "session"],
    defaultUnit: "month",
    extraCharges: ["Registration fee", "Personal trainer"]
  },
  clinic: {
    units: ["visit", "session", "test"],
    defaultUnit: "visit",
    customFields: [{ key: "patient_id", label: "Patient / File No.", type: "text" }]
  },
  "salon-spa": {
    units: ["service", "session", "pcs"],
    defaultUnit: "service",
    extraCharges: ["Product charge"]
  },

  // professional
  "ca-accountant": {
    units: ["project", "month", "year", "hour"],
    defaultUnit: "project",
    customFields: [
      { key: "pan", label: "Client PAN", type: "text" },
      { key: "financial_year", label: "Financial Year", type: "text" }
    ],
    extraCharges: ["Out-of-pocket expenses", "Filing fee", "Govt. fees"]
  },
  lawyer: {
    units: ["hearing", "hour", "project", "month"],
    defaultUnit: "hearing",
    customFields: [{ key: "matter", label: "Case / Matter", type: "text" }],
    extraCharges: ["Court fees", "Out-of-pocket expenses"]
  },

  // home services
  "auto-garage": {
    customFields: [
      { key: "vehicle_no", label: "Vehicle No.", type: "text" },
      { key: "km_reading", label: "KM Reading", type: "text" }
    ],
    extraCharges: ["Labour", "Spare parts", "Washing"]
  },
  "home-cleaning": { units: ["visit", "sqft", "hour", "day"], defaultUnit: "visit" }
};

function resolveBilling(baseBilling, typeKey, categorySlug) {
  const layers = [BILLING_DEFAULTS, baseBilling || {}, TYPE_BILLING[typeKey] || {}, CATEGORY_BILLING[categorySlug] || {}];
  return layers.reduce(
    (acc, layer) => ({ ...acc, ...layer, docLabels: { ...(acc.docLabels || {}), ...(layer.docLabels || {}) } }),
    {}
  );
}

module.exports = { resolveBilling, BILLING_DEFAULTS, TYPE_BILLING, CATEGORY_BILLING };