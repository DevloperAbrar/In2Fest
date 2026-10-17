const FOOD_CATEGORY_SLUGS = ["restaurant", "cloud-kitchen", "bakery-sweets", "food-court", "restaurant-franchise", "small-hotel"];

// What each kind of food business gets on top of the common restaurant tools.
const SUBTYPES = {
  restaurant: { label: "Restaurant / Cafe", tables: true },
  "cloud-kitchen": { label: "Cloud Kitchen", tables: false },
  "bakery-sweets": { label: "Bakery & Sweets", tables: false },
  "food-court": {
    label: "Food Court",
    tables: true,
    unit: { one: "Stall", many: "Stalls", kind: "stall", shareLabel: "Your share of stall sales (%)", shareHint: "What the food court keeps from each stall's sales. The rest is payable to the stall." }
  },
  "restaurant-franchise": {
    label: "Restaurant Franchise",
    tables: true,
    unit: { one: "Outlet", many: "Outlets", kind: "outlet", shareLabel: "Royalty on outlet sales (%)", shareHint: "Royalty the franchisor earns on each outlet's sales." }
  },
  "small-hotel": { label: "Hotel / Guest House", tables: true, roomTabs: true }
};

function subtypeFor(venue) {
  const cats = [venue && venue.business_category, ...((venue && venue.secondary_categories) || [])];
  const slug = cats.find((c) => SUBTYPES[c]);
  return slug ? { slug, ...SUBTYPES[slug] } : null;
}

const ORDER_TYPES = ["dine_in", "takeaway", "delivery"];
const OWNER_SOURCES = ["pos", "zomato", "swiggy", "other_app"];
const STATUSES = ["new", "preparing", "ready", "completed", "cancelled"];
const PAYMENT_MODES = ["cash", "upi", "card", "room", "other"];
const FOOD_TYPES = ["veg", "nonveg", "egg"];
const ING_UNITS = ["kg", "g", "ltr", "ml", "pcs"];

const DEFAULT_MESSAGES = {
  winback: "Hi {{name}} 👋\n{{restaurant}} mein aapki yaad aa rahi hai! Apna favourite khana phir se order karein: {{link}}",
  thanks: "Thank you {{name}} for ordering from {{restaurant}} 🙏\nKhana kaisa laga? Reply karke batayein. Agla order yahan karein: {{link}}"
};

// [name, price, food_type, bestseller?, [[variant, price], ...]?]
const STARTER_MENU = {
  restaurant: [
    ["Starters", [["Paneer Tikka", 240, "veg", true], ["Veg Manchurian", 170, "veg"], ["Chilli Chicken", 260, "nonveg", true], ["French Fries", 120, "veg"]]],
    ["Main Course", [
      ["Dal Makhani", 0, "veg", true, [["Half", 120], ["Full", 210]]],
      ["Shahi Paneer", 0, "veg", false, [["Half", 150], ["Full", 260]]],
      ["Butter Chicken", 0, "nonveg", true, [["Half", 190], ["Full", 340]]],
      ["Veg Biryani", 180, "veg"], ["Chicken Biryani", 230, "nonveg"]
    ]],
    ["Breads", [["Butter Naan", 45, "veg"], ["Tandoori Roti", 20, "veg"], ["Garlic Naan", 60, "veg"]]],
    ["Desserts & Drinks", [["Gulab Jamun", 70, "veg"], ["Cold Coffee", 110, "veg"], ["Fresh Lime Soda", 70, "veg"], ["Masala Chai", 30, "veg"]]]
  ],
  "bakery-sweets": [
    ["Cakes", [
      ["Chocolate Truffle Cake", 0, "veg", true, [["500 g", 650], ["1 kg", 1250]]],
      ["Black Forest Cake", 0, "veg", false, [["500 g", 600], ["1 kg", 1150]]]
    ]],
    ["Pastries", [["Chocolate Pastry", 90, "veg"], ["Pineapple Pastry", 80, "veg"]]],
    ["Sweets", [["Kaju Katli (250 g)", 300, "veg", true], ["Motichoor Ladoo (250 g)", 200, "veg"]]],
    ["Snacks", [["Veg Puff", 25, "veg"], ["Samosa", 15, "veg"]]]
  ]
};

module.exports = {
  FOOD_CATEGORY_SLUGS, SUBTYPES, subtypeFor, ORDER_TYPES, OWNER_SOURCES, STATUSES, PAYMENT_MODES,
  FOOD_TYPES, ING_UNITS, DEFAULT_MESSAGES, STARTER_MENU
};