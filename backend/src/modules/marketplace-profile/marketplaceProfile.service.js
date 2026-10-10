const { Venue, City, VenueServiceArea } = require("../../database/models");
const { sanitizeSecondaryCategories } = require("../../utils/sanitizeSecondaryCategories");
const { AppError } = require("../../middleware/error.middleware");
const { getRedisClient } = require("../../config/redis");
const { slugify } = require("../../utils/slugify");
const {
  getProfileSchema,
  sanitizeProfileAttributes,
  isAttributeFilled
} = require("../../config/marketplaceSchemas");

// Fields the venue owner is allowed to edit from the Marketplace Profile tabs.
// Verification badges and featured_on_homepage are intentionally excluded  - admin only.
const EDITABLE_FIELDS = [
  "business_category", "secondary_categories", "whatsapp_number",
  "instagram_handle", "youtube_channel_link", "external_website", "video_intro_url",
  "primary_locality", "full_pincode", "service_travel_note",
  "year_established", "total_events_completed", "team_size", "languages_spoken",
  "starting_price", "maximum_price", "pricing_note", "advance_payment_percentage", "cancellation_policy",
  "long_description", "specialty_tagline", "famous_events_handled", "awards_recognition",
  "booking_advance_notice_days", "peak_season_months", "off_season_discount_enabled",
  "marketplace_services",
  "marketplace_services_detail", // vendor-defined services with sub-items
  "service_prices",
  "pricing_mode",
  "pricing_unit",        // NEW - "per month", "for two", ...
  "profile_attributes"   // NEW - category specific details (see config/marketplaceSchemas.js)
];

// Kept for backward compatibility: this is the required list for events vendors.
const MANDATORY_FIELDS = [
  "business_category", "long_description", "specialty_tagline", "primary_locality",
  "whatsapp_number", "starting_price", "cancellation_policy", "marketplace_services", "video_intro_url"
];

function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

function isFieldFilled(venue, field, schema) {
  const value = venue[field];
  if (field === "long_description") return wordCount(value) >= schema.min_description_words;
  if (field === "marketplace_services") return Array.isArray(value) && value.length > 0;
  if (value === null || value === undefined || value === "") return false;
  return true;
}

async function getOwnedVenue(venueId, ownerId) {
  const venue = await Venue.findByPk(venueId, {
    include: [{ model: City, as: "serviceAreas", attributes: ["id", "name", "slug", "state"] }]
  });
  if (!venue) throw new AppError("Venue not found", 404);
  if (venue.owner_id !== ownerId) throw new AppError("You do not have access to this venue", 403);
  return venue;
}

// What counts as "complete" depends on the kind of business (category).
function calculateCompletion(venue) {
  const schema = getProfileSchema(venue.business_category, venue.secondary_categories);
  const attrs = venue.profile_attributes || {};
  const requiredAttrs = schema.attributes.filter((a) => a.required);

  const missing = schema.required.filter((field) => !isFieldFilled(venue, field, schema));
  requiredAttrs.forEach((a) => {
    if (!isAttributeFilled(attrs[a.key])) missing.push(`attr:${a.key}`);
  });

  const total = schema.required.length + requiredAttrs.length;
  const percentage = total === 0 ? 100 : Math.round(((total - missing.length) / total) * 100);
  return { percentage, missing_fields: missing };
}

async function getProfile(venueId, ownerId) {
  const venue = await getOwnedVenue(venueId, ownerId);
  const { percentage, missing_fields } = calculateCompletion(venue);
  return { venue, completion: { percentage, missing_fields } };
}

async function updateProfile(venueId, ownerId, payload) {
  const venue = await getOwnedVenue(venueId, ownerId);

  const NUMERIC_FIELDS = ["starting_price", "maximum_price", "advance_payment_percentage"];

  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      // Convert empty strings to null for numeric DB columns so Postgres doesn't choke
      if (NUMERIC_FIELDS.includes(field)) {
        const val = payload[field];
        updates[field] = (val === "" || val === null || val === undefined) ? null : val;
      } else {
        updates[field] = payload[field];
      }
    }
  }

  // This is the write path the vendor portal's Business Details tab actually
  // uses - so this is where the "also offers X" data has to be trustworthy.
  // See sanitizeSecondaryCategories for why.
  if (updates.secondary_categories !== undefined) {
    const primaryCategory = updates.business_category !== undefined ? updates.business_category : venue.business_category;
    updates.secondary_categories = await sanitizeSecondaryCategories(updates.secondary_categories, primaryCategory);
  }

  // The rules below depend on the category the profile will have AFTER this save.
  const targetCategory = updates.business_category !== undefined ? updates.business_category : venue.business_category;
  const targetSecondary = updates.secondary_categories !== undefined ? updates.secondary_categories : venue.secondary_categories;
  const schema = getProfileSchema(targetCategory, targetSecondary);

  if (
    updates.long_description !== undefined &&
    updates.long_description !== "" &&
    wordCount(updates.long_description) < schema.min_description_words
  ) {
    throw new AppError(`Long description must be at least ${schema.min_description_words} words`, 400);
  }

  if (updates.pricing_unit !== undefined) {
    const unit = updates.pricing_unit;
    if (!unit) {
      updates.pricing_unit = null;
    } else if (!schema.price_units.some((u) => u.value === unit)) {
      throw new AppError("Invalid pricing unit for this category", 400);
    }
  }

  if (updates.profile_attributes !== undefined) {
    const clean = sanitizeProfileAttributes(updates.profile_attributes, schema);
    // Keep values that belong to another category (e.g. the vendor switched category
    // and may switch back); only the keys of the current schema are replaced.
    const schemaKeys = new Set(schema.attributes.map((a) => a.key));
    const preserved = {};
    Object.entries(venue.profile_attributes || {}).forEach(([key, value]) => {
      if (!schemaKeys.has(key)) preserved[key] = value;
    });
    updates.profile_attributes = { ...preserved, ...clean };
  }

  await venue.update(updates);

  const refreshed = await getOwnedVenue(venueId, ownerId);

  const redis = await getRedisClient();
  if (redis && refreshed.business_category) {
    const citySlug = slugify(refreshed.city);
    const keys = await redis.keys(`marketplace:city:${citySlug}:cat:${refreshed.business_category}:*`);
    if (keys.length) await redis.del(keys);
  }
  const { percentage, missing_fields } = calculateCompletion(refreshed);
  const isComplete = percentage === 100;

  if (isComplete !== refreshed.marketplace_profile_complete) {
    await refreshed.update({ marketplace_profile_complete: isComplete, marketplace_listed: isComplete });
  }

  return { venue: refreshed, completion: { percentage, missing_fields } };
}

async function updateServiceAreas(venueId, ownerId, citiesInput) {
  await getOwnedVenue(venueId, ownerId); // ownership check

  if (!Array.isArray(citiesInput)) throw new AppError("cities must be an array", 400);
  if (citiesInput.length > 5) throw new AppError("You can select up to 5 additional service cities", 400);

  const resolvedCities = [];
  for (const entry of citiesInput) {
    const name = (entry.name || "").trim();
    const state = (entry.state || "").trim();
    if (!name || !state) throw new AppError("Each selected city needs a name and state", 400);

    const slug = slugify(name);
    const state_slug = slugify(state);

    const [city] = await City.findOrCreate({
      where: { slug },
      defaults: { name, slug, state, state_slug, active: true }
    });
    resolvedCities.push(city);
  }

  const cityIds = resolvedCities.map((c) => c.id);
  await VenueServiceArea.destroy({ where: { venue_id: venueId } });
  await VenueServiceArea.bulkCreate(cityIds.map((city_id) => ({ venue_id: venueId, city_id })));

  return resolvedCities;
}

async function getCompletion(venueId, ownerId) {
  const venue = await getOwnedVenue(venueId, ownerId);
  return calculateCompletion(venue);
}

module.exports = { getProfile, updateProfile, updateServiceAreas, getCompletion, calculateCompletion, MANDATORY_FIELDS };