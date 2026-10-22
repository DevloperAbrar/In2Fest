// What a General business (for example "Other Business") actually does, for cards, headings and the
// website banner. Returns null for every other category, so callers keep the label they already show.
const GENERAL_SLUGS = ["other-business"];

export function getBusinessLabel(venue) {
  if (!venue) return null;
  if (venue.business_type_label) return venue.business_type_label;
  const attrs = venue.profile_attributes || {};
  if (Array.isArray(attrs.business_types) && attrs.business_types[0]) return attrs.business_types[0];
  const slug = venue.business_category || venue.category_slug;
  if (GENERAL_SLUGS.includes(slug) && Array.isArray(attrs.keywords) && attrs.keywords[0]) return attrs.keywords[0];
  return null;
}