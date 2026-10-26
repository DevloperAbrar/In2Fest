// Wording for the inquiry form and the WhatsApp message, per vertical.
// Events keep the original wording (wedding event types), so they are not listed here.

const COPY = {
  gym: {
    dateLabel: "Preferred visit date",
    typeLabel: "I am interested in",
    types: ["Visit the gym", "Membership enquiry", "Personal training", "Group classes"],
    countLabel: "People joining"
  },
  food: {
    dateLabel: "Date",
    typeLabel: "Request type",
    types: ["Table reservation", "Party / bulk order", "Catering enquiry", "General enquiry"],
    countLabel: "Number of guests"
  },
  shops: {
    dateLabel: "Needed by",
    typeLabel: "I want to",
    types: ["Check availability", "Place an order", "Ask for price", "Home delivery"],
    countLabel: "Quantity"
  }
};

// Used for every kind of business that has no vertical of its own above.
// countLabel: null hides the number box (it makes no sense for that business).
const TYPE_COPY = {
  education: {
    dateLabel: "Preferred demo / visit date",
    typeLabel: "I am interested in",
    types: ["Demo class", "Admission enquiry", "Fees & batches", "Course details", "General enquiry"],
    countLabel: "Number of students"
  },
  health_wellness: {
    dateLabel: "Preferred date",
    typeLabel: "I want to",
    types: ["Book an appointment", "Free trial / consultation", "Price list / packages", "General enquiry"],
    countLabel: "Number of people"
  },
  professional: {
    dateLabel: "Preferred consultation date",
    typeLabel: "I need help with",
    types: ["Consultation", "Document / filing work", "Ongoing retainer", "General enquiry"],
    countLabel: null
  },
  home_services: {
    dateLabel: "Preferred visit date",
    typeLabel: "Service needed",
    types: ["Repair / fix an issue", "New installation", "Maintenance / AMC", "Get a quote", "General enquiry"],
    countLabel: null
  }
};

// Other Business: the customer picks from the vendor's OWN services,
// so the enquiry tells the vendor exactly what the customer wants.
function generalCopy(services) {
  const fixed = ["Price / quote request", "General enquiry"];
  const own = [...new Set(
    (Array.isArray(services) ? services : [])
      .map((s) => String(typeof s === "string" ? s : s?.name || "").trim())
      .filter(Boolean)
  )].filter((s) => !fixed.includes(s)).slice(0, 10);

  return {
    dateLabel: "Preferred date (optional)",
    typeLabel: "What are you looking for?",
    types: [...own, ...fixed],
    countLabel: "Quantity (optional)"
  };
}

// verticalKey: gym | food | shops | events | general   (from the profile schema)
// businessType: education | health_wellness | professional | home_services | general | events ...
export function inquiryCopy(verticalKey, businessType, services) {
  if (COPY[verticalKey]) return COPY[verticalKey];
  if (businessType === "general") return generalCopy(services);
  return TYPE_COPY[businessType] || null; // null = original event wording
}

export function buildWhatsAppLink(number, vertical, businessName) {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return null;
  const base = vertical?.whatsapp_message || "Hi, I found you on In2Fest and would like to know more.";
  const text = businessName ? `${base} (${businessName})` : base;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}