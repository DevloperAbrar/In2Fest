const sharp = require("sharp");
const { Venue, City, VenueServiceArea, Category } = require("../../database/models");
const { sanitizeSecondaryCategories } = require("../../utils/sanitizeSecondaryCategories");
const { AppError } = require("../../middleware/error.middleware");
const { uploadToR2 } = require("../../middleware/upload.middleware");
const { getActiveFeatures } = require("../../utils/planAccess");
const { getRedisClient } = require("../../config/redis");
const { slugify } = require("../../utils/slugify");
const { resolveTypeList } = require("../../config/otherBusinessTaxonomy");
const { buildDefaultSections } = require("../../utils/pageSections");
const {
  getProfileSchema,
  sanitizeProfileAttributes,
  isAttributeFilled
} = require("../../config/marketplaceSchemas");

// Free listing vendors (no website builder) get 1 hero image + this many gallery photos.
const FREE_GALLERY_LIMIT = 4;

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

// ---------------------------------------------------------------------------
// Hero image + photos for FREE LISTING vendors
// A vendor whose current plan includes the website builder uploads these from
// the Website Builder instead, so the marketplace upload is switched off for them.
// ---------------------------------------------------------------------------

async function hasWebsiteBuilder(venueId) {
  const features = await getActiveFeatures(venueId);
  return features.includes("website_builder");
}

async function getPhotoAccess(venue) {
  const hasWebsite = await hasWebsiteBuilder(venue.id);
  return {
    enabled: !hasWebsite,
    max_gallery: FREE_GALLERY_LIMIT,
    gallery_count: Array.isArray(venue.gallery) ? venue.gallery.length : 0
  };
}

async function assertPhotoUploadAllowed(venue) {
  if (await hasWebsiteBuilder(venue.id)) {
    throw new AppError(
      "Your plan includes a website. Upload your hero image and photos from the Website Builder.",
      403
    );
  }
}

async function compressImage(file, maxWidth, quality) {
  // rotate() applies the phone's EXIF orientation so photos are not sideways.
  let pipeline = sharp(file.buffer).rotate().resize({ width: maxWidth, withoutEnlargement: true });

  if (file.mimetype === "image/png") {
    pipeline = pipeline.png({ quality, compressionLevel: 8 });
  } else if (file.mimetype === "image/webp") {
    pipeline = pipeline.webp({ quality });
  } else {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }
  return pipeline.toBuffer();
}

// Same cache keys updateProfile clears, so the new images show up in search quickly.
async function clearListingCache(venue) {
  try {
    const redis = await getRedisClient();
    if (redis && venue.business_category) {
      const citySlug = slugify(venue.city);
      const keys = await redis.keys(`marketplace:city:${citySlug}:cat:${venue.business_category}:*`);
      if (keys.length) await redis.del(keys);
    }
  } catch (err) {
    console.error("[MARKETPLACE] cache clear failed:", err.message);
  }
}

async function getProfile(venueId, ownerId) {
  const venue = await getOwnedVenue(venueId, ownerId);
  const { percentage, missing_fields } = calculateCompletion(venue);
  const photo_upload = await getPhotoAccess(venue);
  return { venue, completion: { percentage, missing_fields }, photo_upload };
}

// Number columns of the venue. The profile forms send an empty box as "" and Postgres rejects ""
// for a number column, which used to surface as a 500 "Something went wrong" on save
// (for example when Year established or Faculty size is left blank).
// kind "int" = whole number, "decimal" = money. min / max are the accepted range.
const NUMBER_FIELDS = {
  year_established: { label: "Year established", kind: "int", min: 1800, max: 2100 },
  total_events_completed: { label: "Total events completed", kind: "int", min: 0, max: 2000000000 },
  team_size: { label: "Team size", kind: "int", min: 0, max: 2000000000 },
  advance_payment_percentage: { label: "Advance payment percentage", kind: "int", min: 0, max: 2000000000 },
  booking_advance_notice_days: { label: "Booking advance notice", kind: "int", min: 0, max: 2000000000 },
  starting_price: { label: "Starting price", kind: "decimal", min: 0, max: 99999999.99 },
  maximum_price: { label: "Maximum price", kind: "decimal", min: 0, max: 99999999.99 }
};

// Empty -> null. Otherwise a real number inside the allowed range, or a clear 400 message.
function cleanNumberField(field, raw) {
  const rule = NUMBER_FIELDS[field];
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string" && raw.trim() === "") return null;
  const num = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(num)) throw new AppError(`${rule.label} must be a number`, 400);
  if (rule.kind === "int" && !Number.isInteger(num)) throw new AppError(`${rule.label} must be a whole number`, 400);
  if (num < rule.min || num > rule.max) throw new AppError(`${rule.label} is out of range`, 400);
  return num;
}

async function updateProfile(venueId, ownerId, payload) {
  const venue = await getOwnedVenue(venueId, ownerId);

  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;
    if (NUMBER_FIELDS[field]) {
      const num = cleanNumberField(field, payload[field]);
      // An empty notice-days box keeps the value already saved (the column defaults to 1).
      if (field === "booking_advance_notice_days" && num === null) continue;
      updates[field] = num;
    } else {
      updates[field] = payload[field];
    }
  }

  // Primary category change (for example Other Business -> Auto Garage).
  // The new category must be a real, active one. Keeping the current category is always allowed,
  // even if the admin has deactivated it since.
  const previousCategory = venue.business_category;
  const categoryChanged =
    updates.business_category !== undefined && updates.business_category !== previousCategory;
  if (categoryChanged) {
    const target = await Category.findOne({
      where: { slug: String(updates.business_category || ""), active: true },
      attributes: ["slug"]
    });
    if (!target) throw new AppError("Selected category is not available", 400);
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

  // A saved pricing unit that does not exist in the new category would make the next save fail.
  if (categoryChanged && updates.pricing_unit === undefined && venue.pricing_unit) {
    if (!schema.price_units.some((u) => u.value === venue.pricing_unit)) {
      updates.pricing_unit = null;
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

    // General businesses: keep the business types in one clean form (canonical names for the
    // known types) and store their slugs next to them for fast filtering.
    if (schema.taxonomy) {
      const types = resolveTypeList(updates.profile_attributes.business_types);
      if (types.length) {
        updates.profile_attributes.business_types = types.map((t) => t.label);
        updates.profile_attributes.business_type_slugs = types.map((t) => t.slug);
      } else {
        delete updates.profile_attributes.business_types;
        delete updates.profile_attributes.business_type_slugs;
      }
    }
  }

  // Website: add the sections the new category normally has (for example a menu for a restaurant).
  // Nothing the vendor already built is removed or reordered; new ones go in before the gallery.
  if (categoryChanged && updates.page_sections === undefined && Array.isArray(venue.page_sections) && venue.page_sections.length) {
    const have = new Set(venue.page_sections.map((s) => s && s.type));
    const extra = buildDefaultSections(targetCategory).filter((s) => !have.has(s.type));
    if (extra.length) {
      const next = [...venue.page_sections];
      const galleryAt = next.findIndex((s) => s && s.type === "gallery");
      if (galleryAt === -1) next.push(...extra);
      else next.splice(galleryAt, 0, ...extra);
      updates.page_sections = next;
    }
  }

  const previousCitySlug = slugify(venue.city);

  await venue.update(updates);

  const refreshed = await getOwnedVenue(venueId, ownerId);

  // Clear the city listing cache of the new category and, when it changed, of the old one too,
  // so the vendor leaves the old category page and shows on the new one straight away.
  const redis = await getRedisClient();
  if (redis) {
    const citySlug = slugify(refreshed.city);
    const patterns = new Set();
    if (refreshed.business_category) patterns.add(`marketplace:city:${citySlug}:cat:${refreshed.business_category}:*`);
    if (categoryChanged && previousCategory) patterns.add(`marketplace:city:${previousCitySlug}:cat:${previousCategory}:*`);
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(keys);
    }
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

// Replaces the hero image shown on the marketplace profile and the search card.
async function uploadHeroPhoto(venueId, ownerId, file) {
  if (!file) throw new AppError("Choose an image to upload", 400);

  const venue = await getOwnedVenue(venueId, ownerId);
  await assertPhotoUploadAllowed(venue);

  const compressed = await compressImage(file, 1920, 78);
  const url = await uploadToR2(compressed, file.originalname, "venues", file.mimetype);
  if (!url) throw new AppError("Storage not configured. Please set R2 credentials.", 500);

  await venue.update({ hero_image_url: url });
  await clearListingCache(venue);

  const refreshed = await getOwnedVenue(venueId, ownerId);
  return { venue: refreshed, photo_upload: await getPhotoAccess(refreshed) };
}

// Adds gallery photos (max FREE_GALLERY_LIMIT in total) for free listing vendors.
async function addGalleryPhotos(venueId, ownerId, files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new AppError("Choose at least one photo to upload", 400);
  }

  const venue = await getOwnedVenue(venueId, ownerId);
  await assertPhotoUploadAllowed(venue);

  const existing = Array.isArray(venue.gallery) ? venue.gallery : [];
  const slotsLeft = Math.max(0, FREE_GALLERY_LIMIT - existing.length);
  if (files.length > slotsLeft) {
    throw new AppError(
      slotsLeft === 0
        ? `Free listing allows up to ${FREE_GALLERY_LIMIT} photos. Remove one to add another.`
        : `Free listing allows up to ${FREE_GALLERY_LIMIT} photos. You can add ${slotsLeft} more.`,
      400
    );
  }

  const stamp = Date.now();
  const added = await Promise.all(
    files.map(async (file, idx) => {
      const compressed = await compressImage(file, 1600, 72);
      const url = await uploadToR2(compressed, file.originalname, "gallery", file.mimetype);
      if (!url) throw new AppError("Storage not configured. Please set R2 credentials.", 500);
      return { id: `${stamp}-${idx}`, url, category: null, order: existing.length + idx };
    })
  );

  await venue.update({ gallery: [...existing, ...added] });
  await clearListingCache(venue);

  const refreshed = await getOwnedVenue(venueId, ownerId);
  return { venue: refreshed, photo_upload: await getPhotoAccess(refreshed) };
}

async function deleteGalleryPhoto(venueId, ownerId, imageId) {
  const venue = await getOwnedVenue(venueId, ownerId);
  await assertPhotoUploadAllowed(venue);

  const existing = Array.isArray(venue.gallery) ? venue.gallery : [];
  const filtered = existing.filter((img) => String(img.id) !== String(imageId));
  if (filtered.length === existing.length) throw new AppError("Photo not found", 404);

  await venue.update({ gallery: filtered });
  await clearListingCache(venue);

  const refreshed = await getOwnedVenue(venueId, ownerId);
  return { venue: refreshed, photo_upload: await getPhotoAccess(refreshed) };
}

module.exports = {
  getProfile,
  updateProfile,
  updateServiceAreas,
  getCompletion,
  uploadHeroPhoto,
  addGalleryPhotos,
  deleteGalleryPhoto,
  calculateCompletion,
  MANDATORY_FIELDS
};