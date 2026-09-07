import { BRAND_NAME } from "../constants";

// Centralized title and description builders so every page follows the
// same, search-friendly pattern instead of one-off strings per file.

export function buildTitle(pageType, params = {}) {
  switch (pageType) {
    case "home":
      return `${BRAND_NAME} - Find Verified Wedding and Event Vendors Near You`;
    case "search":
      return `Search Wedding and Event Vendors | ${BRAND_NAME}`;
    case "city":
      return `Wedding and Event Vendors in ${params.cityLabel} | ${BRAND_NAME}`;
    case "category-in-city":
      return `Best ${params.categoryLabel} in ${params.cityLabel} | ${BRAND_NAME}`;
    case "vendor":
      return `${params.vendorName} - ${params.categoryLabel} in ${params.cityLabel} | ${BRAND_NAME}`;
    case "register":
      return `List Your Business Free on ${BRAND_NAME}`;
    default:
      return BRAND_NAME;
  }
}

export function buildDescription(pageType, params = {}) {
  switch (pageType) {
    case "home":
      return `Find and compare verified banquet halls, marriage halls, decorators, caterers, photographers, DJs, mehndi artists, wedding planners, tent houses and event management companies near you. Search, compare and contact vendors directly on ${BRAND_NAME}.`;
    case "search":
      return `Browse verified wedding and event vendors, compare prices and ratings, and contact them directly on ${BRAND_NAME}.`;
    case "city":
      return `Explore verified wedding and event vendors across ${params.cityLabel}, including banquet halls, decorators, caterers and photographers, on ${BRAND_NAME}.`;
    case "category-in-city":
      return `Compare the best ${params.categoryLabel?.toLowerCase()} options in ${params.cityLabel}. Check prices, reviews and photos, and contact them directly on ${BRAND_NAME}.`;
    case "vendor":
      return params.shortDescription || `${params.vendorName} is a verified ${params.categoryLabel?.toLowerCase()} in ${params.cityLabel}, listed on ${BRAND_NAME}. Check prices, reviews, photos and contact details.`;
    case "register":
      return `Get your wedding or event business discovered by real customers on ${BRAND_NAME}. Free listing, no subscription required.`;
    default:
      return `${BRAND_NAME} is a platform to search, compare and contact verified wedding and event vendors near you.`;
  }
}