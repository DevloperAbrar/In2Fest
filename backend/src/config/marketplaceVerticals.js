// Central config for the 4 marketplace verticals: events, gym, shops, food.
// Everything that differs per vertical (CTA, WhatsApp message, labels, which
// attribute groups come first) lives here. The vendor dashboard and the public
// profile page both read it through getProfileSchema().vertical.

const VERTICALS = {
  events: {
    key: "events",
    label: "Events & Weddings",
    cta_label: "Get Quote / Check Date",
    whatsapp_message: "Hi, I found you on In2Fest. I want a quote and to check if my event date is available.",
    group_order: ["Pricing & halls", "Venue details", "Packages", "Catering details", "Decor details", "Work details", "Equipment", "Facilities", "Payments"],
    labels: {}
  },

  gym: {
    key: "gym",
    label: "Gym & Fitness",
    cta_label: "Get Membership Details",
    whatsapp_message: "Hi, I found you on In2Fest. I want to know the membership fees and plans.",
    group_order: ["Gym details", "Trainers & classes", "Payments"],
    priceUnits: ["per month", "per quarter", "per year", "per session"],
    stats: ["starting_price", "attr:gym_type", "year_established", "attr:trainers_count"],
    labels: {
      taglinePlaceholder: "e.g. Women-friendly gym with certified trainers in Indore",
      description: "About your gym",
      achievements: "Certifications & awards",
      highlights: "Transformations & results",
      highlightsPlaceholder: "Member transformations, competitions won, trainer achievements",
      services: "Programs & classes",
      servicesHint: "Add each program you run, for example Weight training, Zumba or Personal training. Break it into batches if it helps.",
      servicesPlaceholder: "Add a program (e.g. Weight training)",
      price: "Membership from",
      priceMax: "Highest plan price",
      policy: "Membership, freeze & refund policy",
      policyHint: "Explain joining fee, plan freeze rules and refunds.",
      inquiry: "Get Membership Details",
      team: "Trainers"
    }
  },

  shops: {
    key: "shops",
    label: "Shops & Retail",
    cta_label: "Order on WhatsApp",
    whatsapp_message: "Hi, I found your shop on In2Fest. I want to know if you have an item in stock and its price.",
    group_order: ["Products", "Store details", "Delivery & orders", "Payments"],
    labels: {}
  },

  food: {
    key: "food",
    label: "Food & Restaurants",
    cta_label: "Order / Reserve",
    whatsapp_message: "Hi, I found you on In2Fest. I want to place an order or reserve a table.",
    group_order: ["Restaurant details", "Kitchen details", "Shop details", "Delivery & orders", "Facilities", "Trust & licences", "Payments"],
    labels: {}
  },

  library: {
    key: "library",
    label: "Library & Study Rooms",
    cta_label: "Check Seat Availability",
    whatsapp_message: "Hi, I found you on In2Fest. I want to know about seat availability, shift timings and monthly fees.",
    group_order: ["Library details", "Facilities", "Payments"],
    priceUnits: ["per month", "per quarter", "per year", "per day"],
    stats: ["starting_price", "attr:total_seats", "year_established", "attr:library_type"],
    labels: {
      taglinePlaceholder: "e.g. Silent AC study library for UPSC and NEET aspirants in Bhopal",
      description: "About your library",
      services: "Seat plans & services",
      servicesHint: "Add what you offer, for example AC reading seats, Individual cabin or Locker. Add the monthly fee if it helps.",
      servicesPlaceholder: "Add a seat plan or service",
      price: "Seat fee from",
      priceMax: "Highest seat fee",
      policy: "Fee, refund & seat policy",
      policyHint: "Explain admission fee, shift change rules and refunds.",
      inquiry: "Check Seat Availability",
      team: "Staff"
    }
  },

  general: {
    key: "general",
    label: "Business",
    cta_label: "WhatsApp",
    whatsapp_message: "Hi, I found you on In2Fest and would like to know more.",
    group_order: [],
    labels: {}
  }
};

const GYM_SLUGS = ["gym-fitness"];
const LIBRARY_SLUGS = ["study-library"];
const TYPE_TO_VERTICAL = { events: "events", retail: "shops", food: "food", library: "library" };

function getVertical(categorySlug, businessTypeKey) {
  if (GYM_SLUGS.includes(categorySlug)) return VERTICALS.gym;
  if (LIBRARY_SLUGS.includes(categorySlug)) return VERTICALS.library;
  const key = TYPE_TO_VERTICAL[businessTypeKey];
  return VERTICALS[key] || VERTICALS.general;
}

// Up to 3 short tags shown on the listing card, chosen per vertical.
function getCardTags(vertical, attrs = {}) {
  const list = (v) => (Array.isArray(v) ? v : []);
  const tags = [];
  switch (vertical?.key) {
    case "gym":
      if (attrs.gym_type) tags.push(attrs.gym_type);
      if (attrs.trial_session) tags.push("Free trial");
      if (attrs.diet_plans) tags.push("Diet plans");
      break;
    case "food":
      list(attrs.cuisines).slice(0, 2).forEach((c) => tags.push(c));
      if (list(attrs.food_type).includes("Pure vegetarian")) tags.push("Pure veg");
      if (list(attrs.dining_options).includes("Home delivery") || attrs.home_delivery) tags.push("Delivery");
      break;
    case "shops":
      if (attrs.home_delivery) tags.push("Home delivery");
      if (attrs.emi_available) tags.push("EMI");
      if (attrs.open_sunday) tags.push("Open Sundays");
      break;
    case "events":
      if (attrs.ac_hall) tags.push("AC hall");
      if (Number(attrs.rooms_available) > 0) tags.push(`${attrs.rooms_available} rooms`);
      if (Number(attrs.parking_capacity) > 0) tags.push("Parking");
      break;
    case "library":
      if (attrs.library_type) tags.push(attrs.library_type);
      if (list(attrs.facilities).includes("AC")) tags.push("AC");
      if (attrs.open_24x7) tags.push("Open 24x7");
      else if (attrs.trial_day) tags.push("Free trial day");
      break;
    default:
      break;
  }
  return tags.slice(0, 3);
}

module.exports = { VERTICALS, getVertical, getCardTags };