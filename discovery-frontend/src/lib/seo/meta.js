import { BRAND_NAME } from "../constants";

// Centralized title and description builders so every page follows the
// same, search-friendly pattern instead of one-off strings per file.

export function buildTitle(pageType, params = {}) {
  switch (pageType) {
    case "home":
      return `${BRAND_NAME} - Find Verified Local Businesses & Vendors Near You`;
    case "search":
      return `Search Local Businesses and Vendors | ${BRAND_NAME}`;
    case "city":
      return `Local Businesses and Vendors in ${params.cityLabel} | ${BRAND_NAME}`;
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
      return `${BRAND_NAME} helps you find and contact verified coaching classes, gyms, clinics, shops, event vendors and local services near you. Compare prices and reviews, no middleman.`;
    case "search":
      return `Browse verified local businesses and vendors, compare prices and ratings, and contact them directly on ${BRAND_NAME}.`;
    case "city":
      return `Explore verified businesses and vendors across ${params.cityLabel}, from classes and clinics to shops and event services, on ${BRAND_NAME}.`;
    case "category-in-city":
      return `Compare the best ${params.categoryLabel?.toLowerCase()} options in ${params.cityLabel}. Check prices, reviews and photos, and contact them directly on ${BRAND_NAME}.`;
    case "vendor":
      return params.shortDescription || `${params.vendorName} is a verified ${params.categoryLabel?.toLowerCase()} in ${params.cityLabel}, listed on ${BRAND_NAME}. Check prices, reviews, photos and contact details.`;
    case "register":
      return `Get your business discovered by real customers on ${BRAND_NAME}. Free listing, free website, no subscription required.`;
    default:
      return `${BRAND_NAME} is a platform to search, compare and contact verified local businesses and vendors near you.`;
  }
}