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
      group_order: ["Venue details", "Catering details", "Decor details", "Work details", "Equipment", "Facilities", "Payments"],
      labels: {}
    },
  
    gym: {
      key: "gym",
      label: "Gym & Fitness",
      cta_label: "Book Free Trial",
      whatsapp_message: "Hi, I found you on In2Fest. I want to know the membership fees and book a free trial.",
      group_order: ["Gym details", "Payments"],
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
        inquiry: "Book Free Trial",
        team: "Trainers"
      }
    },
  
    shops: {
      key: "shops",
      label: "Shops & Retail",
      cta_label: "Order on WhatsApp",
      whatsapp_message: "Hi, I found your shop on In2Fest. I want to know if you have an item in stock and its price.",
      group_order: ["Store details", "Delivery & orders", "Payments"],
      labels: {}
    },
  
    food: {
      key: "food",
      label: "Food & Restaurants",
      cta_label: "Order / Reserve",
      whatsapp_message: "Hi, I found you on In2Fest. I want to place an order or reserve a table.",
      group_order: ["Restaurant details", "Kitchen details", "Shop details", "Delivery & orders", "Facilities", "Payments"],
      labels: {}
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
  const TYPE_TO_VERTICAL = { events: "events", retail: "shops", food: "food" };
  
  function getVertical(categorySlug, businessTypeKey) {
    if (GYM_SLUGS.includes(categorySlug)) return VERTICALS.gym;
    const key = TYPE_TO_VERTICAL[businessTypeKey];
    return VERTICALS[key] || VERTICALS.general;
  }
  
  module.exports = { VERTICALS, getVertical };