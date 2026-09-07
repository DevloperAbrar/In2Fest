// Fixed backend enums (category slugs, plan names) aren't vendor-editable
// content, so they get a static bilingual dictionary here instead of
// being run through translation. Slugs are permanent
// (see backend/src/config/categories.js) - safe to key off them.

export const CATEGORY_LABELS_HI = {
    "marriage-hall": "मैरिज हॉल",
    "banquet-hall": "बैंक्वेट हॉल",
    "party-lawn": "पार्टी लॉन",
    "farmhouse": "फ़ार्महाउस",
    "photographer": "फ़ोटोग्राफ़र",
    "videographer": "वीडियोग्राफ़र",
    "decorator": "डेकोरेटर",
    "caterer": "केटरर",
    "dj": "डीजे",
    "makeup-artist": "मेकअप आर्टिस्ट",
    "mehendi-artist": "मेहंदी आर्टिस्ट",
    "tent-house": "टेंट हाउस",
    "sound-lighting": "साउंड और लाइटिंग",
    "card-printing": "कार्ड प्रिंटिंग",
    "horse-buggy": "घोड़ा-बग्घी",
    "pandit-services": "पंडित सेवाएं",
    "travel-transport": "ट्रैवल और ट्रांसपोर्ट",
    "event-manager": "इवेंट मैनेजर",
  };
  
  export const PLAN_LABELS_HI = {
    Free: "फ्री",
    Starter: "स्टार्टर",
    Growth: "ग्रोथ",
    Pro: "प्रो",
  };
  
  // category: the {slug, name} object your /meta/categories API already returns.
  // Falls back to category.name (English) when there's no Hindi entry or the
  // current language isn't Hindi - always safe to call.
  export function translateCategory(category, lang) {
    if (!category) return "";
    if (lang === "hi" && CATEGORY_LABELS_HI[category.slug]) {
      return CATEGORY_LABELS_HI[category.slug];
    }
    return category.name;
  }
  
  export function translatePlanName(name, lang) {
    if (lang === "hi" && PLAN_LABELS_HI[name]) return PLAN_LABELS_HI[name];
    return name;
  }