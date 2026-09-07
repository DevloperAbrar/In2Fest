const SLOT_CATEGORY_CONFIG = {
    "marriage-hall": {
      allowedTypes: ["time_slot", "full_day"],
      defaultType: "time_slot",
      suggestions: ["Morning", "Afternoon", "Evening", "Night", "Full Day"]
    },
    "banquet-hall": {
      allowedTypes: ["time_slot", "full_day"],
      defaultType: "time_slot",
      suggestions: ["Morning", "Afternoon", "Evening", "Full Day"]
    },
    "party-lawn": {
      allowedTypes: ["full_day", "time_slot"],
      defaultType: "full_day",
      suggestions: ["Full Day", "Morning", "Evening"]
    },
    "farmhouse": {
      allowedTypes: ["full_day", "time_slot"],
      defaultType: "full_day",
      suggestions: ["Full Day", "Day Outing", "Overnight"]
    },
    "photographer": {
      allowedTypes: ["package", "hourly"],
      defaultType: "package",
      suggestions: ["Half Day", "Full Day", "Pre-Wedding Shoot", "2-Day Wedding", "Candid Package"]
    },
    "videographer": {
      allowedTypes: ["package", "hourly"],
      defaultType: "package",
      suggestions: ["Highlight Film", "Full Day", "Cinematic Wedding", "Drone Add-on"]
    },
    "decorator": {
      allowedTypes: ["package"],
      defaultType: "package",
      suggestions: ["Basic Decor", "Premium Decor", "Floral Package", "Grand Stage"]
    },
    "event-manager": {
      allowedTypes: ["package"],
      defaultType: "package",
      suggestions: ["Basic Planning", "Full Management", "Day-of Coordination"]
    },
    "wedding-planner": {
      allowedTypes: ["package"],
      defaultType: "package",
      suggestions: ["Consultation Only", "Partial Planning", "Full Wedding Package"]
    },
    "choreographer": {
      allowedTypes: ["package", "hourly"],
      defaultType: "package",
      suggestions: ["Sangeet Package", "Solo Choreography", "Group (5–10 people)", "Bride & Groom"]
    },
    "anchor-emcee": {
      allowedTypes: ["time_slot", "hourly"],
      defaultType: "time_slot",
      suggestions: ["Reception (3 hrs)", "Full Day", "Sangeet Night"]
    },
    "caterer": {
      allowedTypes: ["package"],
      defaultType: "package",
      suggestions: ["Veg Menu (per plate)", "Non-Veg Menu", "Premium Buffet", "Live Counters Add-on"]
    },
    "cake-bakery": {
      allowedTypes: ["package"],
      defaultType: "package",
      suggestions: ["1 Kg Cake", "2 Kg Custom Cake", "Multi-tier Wedding Cake"]
    },
    "return-gifts": {
      allowedTypes: ["package"],
      defaultType: "package",
      suggestions: ["50 Pcs Box", "100 Pcs Box", "Custom Hamper"]
    },
    "dj": {
      allowedTypes: ["hourly", "time_slot"],
      defaultType: "hourly",
      suggestions: ["DJ Setup", "Night Show", "Pool Party", "Reception"]
    },
    "live-band": {
      allowedTypes: ["time_slot", "hourly"],
      defaultType: "time_slot",
      suggestions: ["2-Hour Set", "Evening Show", "Full Night"]
    },
    "horse-buggy": {
      allowedTypes: ["package"],
      defaultType: "package",
      suggestions: ["Baraat Entry (1 hr)", "Baraat + 30 min extra", "Decorated Buggy Only"]
    },
    "makeup-artist": {
      allowedTypes: ["time_slot", "package"],
      defaultType: "time_slot",
      suggestions: ["Bridal Makeup", "Party Makeup", "Family Package (4 people)", "Engagement Look"]
    },
    "mehendi-artist": {
      allowedTypes: ["time_slot", "package"],
      defaultType: "time_slot",
      suggestions: ["Bridal Full Hands & Feet", "Simple Hands Only", "Group Session", "Quick Design"]
    },
    "bridal-wear": {
      allowedTypes: ["package"],
      defaultType: "package",
      suggestions: ["Lehenga Rental", "Saree Draping Package", "Full Bridal Outfit"]
    },
    "jewellery-rental": {
      allowedTypes: ["package"],
      defaultType: "package",
      suggestions: ["Bridal Set", "Maang Tikka + Earrings", "Full Jewellery Package"]
    },
    "sound-lighting": {
      allowedTypes: ["hourly", "package"],
      defaultType: "hourly",
      suggestions: ["PA System (per hr)", "Full Event Package", "DJ + Lights Bundle"]
    },
    "card-printing": {
      allowedTypes: ["package"],
      defaultType: "package",
      suggestions: ["100 Cards", "250 Cards", "500 Cards", "Premium Box Set"]
    },
    "pandit-services": {
      allowedTypes: ["time_slot", "package"],
      defaultType: "time_slot",
      suggestions: ["Short Puja (1–2 hrs)", "Half-Day Puja", "Full Wedding Ceremony"]
    },
    "travel-transport": {
      allowedTypes: ["package", "hourly"],
      defaultType: "package",
      suggestions: ["Airport Transfer", "Day Hire (8 hrs)", "Wedding Car Rental", "Bus / Mini-Bus"]
    },
    "wedding-car-rental": {
      allowedTypes: ["package", "hourly"],
      defaultType: "package",
      suggestions: ["Decorated Car (4 hrs)", "Luxury Car Full Day", "Vintage Car Package"]
    },
    "tent-house": {
      allowedTypes: ["package"],
      defaultType: "package",
      suggestions: ["Basic Shamiana", "Premium Tent Setup", "AC Tent Package"]
    }
  };
  
  function getSlotConfig(categorySlug) {
    return SLOT_CATEGORY_CONFIG[categorySlug] || {
      allowedTypes: ["time_slot", "full_day", "hourly", "package"],
      defaultType: "time_slot",
      suggestions: []
    };
  }
  
  module.exports = { SLOT_CATEGORY_CONFIG, getSlotConfig };