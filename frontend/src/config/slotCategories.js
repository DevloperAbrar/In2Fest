export const PRICING_TYPE_META = {
    time_slot: {
      label: "Time Slot",
      description: "Named window of time with a fixed price (e.g. Morning 11am–2pm)",
      icon: "Clock"
    },
    full_day: {
      label: "Full Day",
      description: "All-day flat rate, no specific start/end time",
      icon: "Sun"
    },
    hourly: {
      label: "Hourly",
      description: "Price per hour  - great for DJs, photographers, sound systems",
      icon: "Timer"
    },
    package: {
      label: "Package",
      description: "Named bundle with inclusions  - great for photographers, caterers, decorators",
      icon: "Package"
    }
  };
  
  const CONFIG = {
    "marriage-hall":      { allowedTypes: ["time_slot", "full_day"],  suggestions: ["Morning", "Afternoon", "Evening", "Night", "Full Day"] },
    "banquet-hall":       { allowedTypes: ["time_slot", "full_day"],  suggestions: ["Morning", "Afternoon", "Evening", "Full Day"] },
    "party-lawn":         { allowedTypes: ["full_day", "time_slot"],  suggestions: ["Full Day", "Morning", "Evening"] },
    "farmhouse":          { allowedTypes: ["full_day", "time_slot"],  suggestions: ["Full Day", "Day Outing", "Overnight"] },
    "photographer":       { allowedTypes: ["package", "hourly"],      suggestions: ["Half Day", "Full Day", "Pre-Wedding Shoot", "2-Day Wedding", "Candid Package"] },
    "videographer":       { allowedTypes: ["package", "hourly"],      suggestions: ["Highlight Film", "Full Day", "Cinematic Wedding", "Drone Add-on"] },
    "decorator":          { allowedTypes: ["package"],                suggestions: ["Basic Decor", "Premium Decor", "Floral Package", "Grand Stage"] },
    "event-manager":      { allowedTypes: ["package"],                suggestions: ["Basic Planning", "Full Management", "Day-of Coordination"] },
    "wedding-planner":    { allowedTypes: ["package"],                suggestions: ["Consultation Only", "Partial Planning", "Full Wedding Package"] },
    "choreographer":      { allowedTypes: ["package", "hourly"],      suggestions: ["Sangeet Package", "Solo", "Group (5–10)", "Bride & Groom"] },
    "anchor-emcee":       { allowedTypes: ["time_slot", "hourly"],    suggestions: ["Reception (3 hrs)", "Full Day", "Sangeet Night"] },
    "caterer":            { allowedTypes: ["package"],                suggestions: ["Veg Menu (per plate)", "Non-Veg Menu", "Premium Buffet"] },
    "cake-bakery":        { allowedTypes: ["package"],                suggestions: ["1 Kg Cake", "2 Kg Cake", "Wedding Cake"] },
    "return-gifts":       { allowedTypes: ["package"],                suggestions: ["50 Pcs", "100 Pcs", "Custom Hamper"] },
    "dj":                 { allowedTypes: ["hourly", "time_slot"],    suggestions: ["Night Show", "Pool Party", "Reception", "4-hr Set"] },
    "live-band":          { allowedTypes: ["time_slot", "hourly"],    suggestions: ["2-Hour Set", "Evening Show", "Full Night"] },
    "horse-buggy":        { allowedTypes: ["package"],                suggestions: ["Baraat Entry (1 hr)", "Baraat + 30 min extra"] },
    "makeup-artist":      { allowedTypes: ["time_slot", "package"],   suggestions: ["Bridal Makeup", "Party Makeup", "Family Package"] },
    "mehendi-artist":     { allowedTypes: ["time_slot", "package"],   suggestions: ["Bridal Full", "Simple Hands", "Group Session"] },
    "bridal-wear":        { allowedTypes: ["package"],                suggestions: ["Lehenga Rental", "Saree Draping", "Full Bridal Outfit"] },
    "jewellery-rental":   { allowedTypes: ["package"],                suggestions: ["Bridal Set", "Maang Tikka + Earrings", "Full Package"] },
    "sound-lighting":     { allowedTypes: ["hourly", "package"],      suggestions: ["PA System", "Full Event Package", "DJ + Lights Bundle"] },
    "card-printing":      { allowedTypes: ["package"],                suggestions: ["100 Cards", "250 Cards", "500 Cards"] },
    "pandit-services":    { allowedTypes: ["time_slot", "package"],   suggestions: ["Short Puja (1–2 hrs)", "Half-Day Puja", "Full Ceremony"] },
    "travel-transport":   { allowedTypes: ["package", "hourly"],      suggestions: ["Airport Transfer", "Day Hire (8 hrs)", "Wedding Car"] },
    "wedding-car-rental": { allowedTypes: ["package", "hourly"],      suggestions: ["Decorated Car (4 hrs)", "Luxury Car Full Day", "Vintage Car"] },
    "tent-house":         { allowedTypes: ["package"],                suggestions: ["Basic Shamiana", "Premium Tent", "AC Tent Package"] },
  };
  
  const FALLBACK = {
    allowedTypes: ["time_slot", "full_day", "hourly", "package"],
    suggestions: []
  };
  
  export function getSlotConfig(categorySlug) {
    const cfg = CONFIG[categorySlug] || FALLBACK;
    return {
      allowedTypes: cfg.allowedTypes,
      defaultType: cfg.allowedTypes[0],
      suggestions: cfg.suggestions || []
    };
  }