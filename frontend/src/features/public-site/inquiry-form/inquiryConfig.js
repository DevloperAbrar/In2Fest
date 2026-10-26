import { useMemo } from "react";
import * as yup from "yup";
import { inquiryFormSchema } from "../../../components/forms/validationSchemas";
import { useBusinessProfile } from "../../../hooks/useBusinessProfile";
import { getVertical } from "../../../lib/verticals";

// Original wedding / event form. Used for Events and any business without its own wording.
const EVENT_CFG = {
  isEvent: true,
  dateLabel: "Event date",
  dateRequired: true,
  typeLabel: "Event Type",
  types: null, // free text box
  countLabel: "Guest Count",
  countRequired: true,
  allowSlots: true
};

const GYM = {
  isEvent: false,
  dateLabel: "Preferred visit date",
  dateRequired: false,
  typeLabel: "I am interested in",
  types: ["Visit the gym", "Membership enquiry", "Personal training", "Group classes"],
  countLabel: "People joining",
  countRequired: false,
  allowSlots: true
};

const FOOD = {
  isEvent: false,
  dateLabel: "Date",
  dateRequired: false,
  typeLabel: "Request type",
  types: ["Table reservation", "Party / bulk order", "Catering enquiry", "General enquiry"],
  countLabel: "Number of guests",
  countRequired: false,
  allowSlots: false // restaurants never use event-style slots
};

const SHOP = {
  isEvent: false,
  dateLabel: "Needed by",
  dateRequired: false,
  typeLabel: "I want to",
  types: ["Check availability", "Place an order", "Ask for price", "Home delivery"],
  countLabel: "Quantity",
  countRequired: false,
  allowSlots: false
};

const BY_KEY = {
  gym: GYM,
  food: FOOD,
  shop: SHOP,
  retail: SHOP,
  education: {
    isEvent: false,
    dateLabel: "Preferred demo / visit date",
    dateRequired: false,
    typeLabel: "I am interested in",
    types: ["Demo class", "Admission enquiry", "Fees & batches", "Course details", "General enquiry"],
    countLabel: "Number of students",
    countRequired: false,
    allowSlots: true
  },
  health_wellness: {
    isEvent: false,
    dateLabel: "Preferred date",
    dateRequired: false,
    typeLabel: "I want to",
    types: ["Book an appointment", "Free trial / consultation", "Price list / packages", "General enquiry"],
    countLabel: "Number of people",
    countRequired: false,
    allowSlots: true
  },
  professional: {
    isEvent: false,
    dateLabel: "Preferred consultation date",
    dateRequired: false,
    typeLabel: "I need help with",
    types: ["Consultation", "Document / filing work", "Ongoing retainer", "General enquiry"],
    countLabel: null, // hides the number box
    countRequired: false,
    allowSlots: true
  },
  home_services: {
    isEvent: false,
    dateLabel: "Preferred visit date",
    dateRequired: false,
    typeLabel: "Service needed",
    types: ["Repair / fix an issue", "New installation", "Maintenance / AMC", "Get a quote", "General enquiry"],
    countLabel: null,
    countRequired: false,
    allowSlots: true
  }
};

// Other Business: the customer picks from the vendor's OWN services.
function generalCfg(services) {
  const fixed = ["Price / quote request", "General enquiry"];
  const own = [
    ...new Set(
      (Array.isArray(services) ? services : [])
        .map((s) => String(typeof s === "string" ? s : s?.name || "").trim())
        .filter(Boolean)
    )
  ]
    .filter((s) => !fixed.includes(s))
    .slice(0, 10);

  return {
    isEvent: false,
    dateLabel: "Preferred date (optional)",
    dateRequired: false,
    typeLabel: "What are you looking for?",
    types: [...own, ...fixed],
    countLabel: "Quantity (optional)",
    countRequired: false,
    allowSlots: false
  };
}

export function buildInquirySchema(cfg) {
  const optionalInt = yup
    .number()
    .transform((value, original) => (original === "" || original === null || original === undefined ? null : value))
    .nullable()
    .positive("Enter a valid number")
    .integer("Enter a valid number");

  const overrides = {
    event_date: cfg.dateRequired ? yup.string().required("Event date is required") : yup.string().nullable(),
    event_type: yup.string().required(cfg.isEvent ? "Event type is required" : "Please choose an option")
  };

  if (cfg.countLabel === null) overrides.guest_count = yup.mixed().nullable();
  else if (!cfg.countRequired) overrides.guest_count = optionalInt;

  return inquiryFormSchema.shape(overrides);
}

// Returns what the website enquiry form should show for this vendor.
export function useInquiryConfig(venue, slots) {
  const { profile } = useBusinessProfile(venue?.business_category, venue?.secondary_categories || []);

  const verticalKey = getVertical(venue).key; // gym | shop | food | venue
  const typeKey = profile?.key || null;
  const servicesKey = JSON.stringify(venue?.marketplace_services || []);

  const cfg = useMemo(() => {
    if (verticalKey !== "venue" && BY_KEY[verticalKey]) return BY_KEY[verticalKey];
    if (typeKey === "general") return generalCfg(JSON.parse(servicesKey));
    return BY_KEY[typeKey] || EVENT_CFG;
  }, [verticalKey, typeKey, servicesKey]);

  const schema = useMemo(() => buildInquirySchema(cfg), [cfg]);

  const hasSlotsModule = Array.isArray(profile?.modules) && profile.modules.includes("slots");
  const showSlots = cfg.allowSlots && hasSlotsModule && Array.isArray(slots) && slots.length > 0;

  return { cfg, schema, showSlots };
}