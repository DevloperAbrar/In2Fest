// Wording for the inquiry form and the WhatsApp message, per vertical.
// Events keep the original wording, so they are not listed here.

const COPY = {
    gym: {
      dateLabel: "Preferred trial date",
      typeLabel: "I am interested in",
      types: ["Free trial session", "Membership enquiry", "Personal training", "Group classes"],
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
  
  export function inquiryCopy(verticalKey) {
    return COPY[verticalKey] || null;
  }
  
  export function buildWhatsAppLink(number, vertical, businessName) {
    const digits = String(number || "").replace(/\D/g, "");
    if (!digits) return null;
    const base = vertical?.whatsapp_message || "Hi, I found you on In2Fest and would like to know more.";
    const text = businessName ? `${base} (${businessName})` : base;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }