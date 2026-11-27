// Registry of features that are SOLD ON TOP of a plan ("add-ons").
//
// The code here only says WHAT an add-on is and WHO it is for. The price is NOT here: the Super Admin
// sets it in Admin > Add-ons (table addon_prices), so it can change at any time without a deploy.
//
// To add a new add-on later (for example an Academy one):
//   1. Add ONE entry below (key is permanent, never rename it).
//   2. Gate the feature's routes with a check for that key and the screen with <RequireAddon feature="<key>">.
// It stays invisible to every vendor until the Super Admin sets a price and switches it on.
//
// segments : vendor business segments that can use it (see config/vendorSegments.js).
//            "gym" = Gym & Fitness, "academy" = Sports Academy, "studio" = Classes & Studios.
// parent   : the base plan feature the vendor must already have (Academy and Studio also use "gym").
const ADDONS = [
    {
      key: "gym_body",
      label: "Body Measurement",
      description: "Full body size, health, treadmill and strength readings for every member, with progress charts and a professional PDF report.",
      parent: "gym",
      segments: ["gym"],
      sort: 10
    }
  ];
  
  const BY_KEY = new Map(ADDONS.map((a) => [a.key, a]));
  
  module.exports = {
    ADDONS,
    ADDON_KEYS: ADDONS.map((a) => a.key),
    get: (key) => BY_KEY.get(key) || null,
    isAddonKey: (key) => BY_KEY.has(key)
  };