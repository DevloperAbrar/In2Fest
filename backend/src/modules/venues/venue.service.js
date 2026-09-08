const { Venue, Subscription, Plan, User } = require("../../database/models");
const { calculateCompletion } = require("../marketplace-profile/marketplaceProfile.service");
const { buildDefaultSections, normalizeSections } = require("../../utils/pageSections");
const { SECTION_TYPES } = require("../../config/sectionLibrary");
const { AppError } = require("../../middleware/error.middleware");
const { uploadToR2 } = require("../../middleware/upload.middleware");
const sharp = require("sharp");

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function generateUniqueSubdomain(hallName) {
  let base = slugify(hallName) || "venue";
  let subdomain = base;
  let counter = 1;

  while (await Venue.findOne({ where: { subdomain } })) {
    subdomain = `${base}-${counter}`;
    counter++;
  }

  return subdomain;
}

/**
 * Compress an image buffer in-memory using sharp.
 * Returns a compressed buffer (always JPEG for consistency).
 */
async function compressBuffer(buffer, mimetype, options = {}) {
  const { maxWidth = 1600, quality = 75 } = options;

  let pipeline = sharp(buffer).resize({ width: maxWidth, withoutEnlargement: true });

  if (mimetype === "image/png") {
    pipeline = pipeline.png({ quality, compressionLevel: 8 });
  } else if (mimetype === "image/webp") {
    pipeline = pipeline.webp({ quality });
  } else {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  return pipeline.toBuffer();
}

async function createVenue(payload) {
  const existingVenue = await Venue.findOne({ where: { owner_id: payload.owner_id } });
  if (existingVenue) {
    throw new AppError("You already have a business profile. Only one profile is allowed per account.", 409);
  }

  const subdomain = await generateUniqueSubdomain(payload.hall_name);

  const venue = await Venue.create({
    owner_id: payload.owner_id,
    hall_name: payload.hall_name,
    owner_name: payload.owner_name,
    phone: payload.phone,
    city: payload.city,
    address: payload.address,
    google_maps_link: payload.google_maps_link,
    capacity: payload.capacity,
    venue_type: payload.venue_type,
    business_category: payload.business_category,
    secondary_categories: Array.isArray(payload.secondary_categories) ? payload.secondary_categories : [],
    primary_locality: payload.primary_locality,
    team_size: payload.team_size,
    starting_price: payload.starting_price,
    subdomain
  });

  venue.page_sections = buildDefaultSections(payload.business_category);
  await venue.save();

  const { createSubscription, createFreeSubscription } = require("../subscriptions/subscription.service");

  if (payload.plan_id) {
    const plan = await Plan.findByPk(payload.plan_id);
    if (!plan) throw new AppError("Plan not found", 404);

    // Paid plan with NO free trial -> don't activate a subscription yet.
    // The frontend will open Razorpay checkout right after this, and
    // payment.controller.verifyPayment() creates the subscription once
    // the payment is confirmed.
    if (Number(plan.monthly_price) > 0 && Number(plan.trial_days) === 0) {
      // intentionally skipped — awaiting payment
    } else {
      await createSubscription(venue.id, payload.plan_id);
    }
  } else {
    await createFreeSubscription(venue.id);
  }

  return venue;
}

async function getVenueById(venueId) {
  const venue = await Venue.findByPk(venueId, {
    include: [
      { model: Subscription, as: "subscription", include: [{ model: Plan, as: "plan" }] },
      { model: User, as: "owner", attributes: ["id", "email"] }
    ]
  });

  if (!venue) throw new AppError("Venue not found", 404);

  const { percentage, missing_fields } = calculateCompletion(venue);
  venue.setDataValue("marketplace_completion", { percentage, missing_fields });
  venue.setDataValue("page_sections", normalizeSections(venue));

  return venue;
}

async function getVenuesByOwner(ownerId) {
  const venues = await Venue.findAll({
    where: { owner_id: ownerId },
    include: [
      { model: Subscription, as: "subscription", include: [{ model: Plan, as: "plan" }] }
    ]
  });

  venues.forEach((venue) => venue.setDataValue("page_sections", normalizeSections(venue)));
  return venues;
}

async function updateVenue(venueId, ownerId, updates) {
  const venue = await Venue.findOne({ where: { id: venueId, owner_id: ownerId } });
  if (!venue) throw new AppError("Venue not found or access denied", 404);

  const allowedFields = [
    "hall_name", "owner_name", "phone", "city", "address", "google_maps_link",
    "capacity", "venue_type", "business_category", "secondary_categories",
    "primary_locality", "team_size", "starting_price", "about_text", "services",
    "gst_enabled", "gst_number", "upi_id", "bank_details", "page_sections",
    "gallery", "custom_domain", "whatsapp_token", "whatsapp_phone_number_id",
    "lead_notify_email", "lead_notify_whatsapp", "primary_color",
    "meta_title", "meta_description"
  ];

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) venue[field] = updates[field];
  });

  if (updates.page_sections !== undefined) {
    venue.page_sections = normalizeSections(venue);
  }

  await venue.save();
  await recalculateSetupChecklist(venue);
  return venue;
}

async function uploadHeroImage(venueId, ownerId, file) {
  const venue = await Venue.findOne({ where: { id: venueId, owner_id: ownerId } });
  if (!venue) throw new AppError("Venue not found or access denied", 404);

  // Compress in-memory
  const compressed = await compressBuffer(file.buffer, file.mimetype, { maxWidth: 1920, quality: 78 });

  // Upload to R2
  const url = await uploadToR2(compressed, file.originalname, "venues", file.mimetype);
  if (!url) throw new AppError("Storage not configured. Please set R2 credentials.", 500);

  venue.hero_image_url = url;
  await venue.save();
  await recalculateSetupChecklist(venue);
  return venue;
}

async function addGalleryImages(venueId, ownerId, files) {
  const venue = await Venue.findOne({ where: { id: venueId, owner_id: ownerId } });
  if (!venue) throw new AppError("Venue not found or access denied", 404);

  const existing = venue.gallery || [];
  if (existing.length + files.length > 20) {
    throw new AppError("Gallery limit is 20 photos", 400);
  }

  // Compress and upload each file
  const newImages = await Promise.all(
    files.map(async (file, idx) => {
      const compressed = await compressBuffer(file.buffer, file.mimetype, { maxWidth: 1600, quality: 72 });
      const url = await uploadToR2(compressed, file.originalname, "gallery", file.mimetype);
      if (!url) throw new AppError("Storage not configured. Please set R2 credentials.", 500);
      return {
        id: `${Date.now()}-${idx}`,
        url,
        category: null,
        order: existing.length + idx
      };
    })
  );

  venue.gallery = [...existing, ...newImages];
  await venue.save();
  await recalculateSetupChecklist(venue);
  return venue;
}

async function uploadSectionImage(venueId, ownerId, file) {
  const venue = await Venue.findOne({ where: { id: venueId, owner_id: ownerId } });
  if (!venue) throw new AppError("Venue not found or access denied", 404);

  const compressed = await compressBuffer(file.buffer, file.mimetype, { maxWidth: 1200, quality: 75 });
  const url = await uploadToR2(compressed, file.originalname, "venues", file.mimetype);
  if (!url) throw new AppError("Storage not configured. Please set R2 credentials.", 500);

  return { url };
}

async function recalculateSetupChecklist(venue) {
  const { Slot } = require("../../database/models");

  const sections = normalizeSections(venue);
  const sectionByType = new Map(sections.map((s) => [s.type, s]));
  const steps = [];

  if (venue.hero_image_url) steps.push("hero_image");

  const aboutSection = sectionByType.get("about");
  if (aboutSection?.visible !== false && venue.about_text) steps.push("about");

  const servicesSection = sectionByType.get("services");
  if (servicesSection?.visible !== false && venue.services?.length > 0) steps.push("services");

  const gallerySection = sectionByType.get("gallery");
  if (gallerySection?.visible !== false && venue.gallery?.length > 0) steps.push("gallery");

  const slotCount = await Slot.count({ where: { venue_id: venue.id, is_active: true } });
  if (slotCount > 0) steps.push("slots");

  let hasFilledPluggableSection = false;
  sections.forEach((section) => {
    const def = SECTION_TYPES[section.type];
    if (!def?.removable || section.visible === false) return;
    if (section.config?.items?.length > 0) {
      steps.push(section.type);
      hasFilledPluggableSection = true;
    }
  });

  if (hasFilledPluggableSection) steps.push("pluggable_section");

  venue.setup_checklist = steps;
  await venue.save();
}

module.exports = {
  createVenue,
  getVenueById,
  getVenuesByOwner,
  updateVenue,
  uploadHeroImage,
  addGalleryImages,
  uploadSectionImage,
  recalculateSetupChecklist
};