const { sanitizeSecondaryCategories } = require("../../utils/sanitizeSecondaryCategories");
const { Op } = require("sequelize");
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

  const secondaryCategories = await sanitizeSecondaryCategories(payload.secondary_categories, payload.business_category);

  // The registration flow only sends business_category + secondary_categories.
  // Mirror them into venue_type (unless the client sent one explicitly) so the
  // Venue Profile settings, slots, clients, bookings etc. all see what the vendor selected.
  const venueTypes =
    Array.isArray(payload.venue_type) && payload.venue_type.length > 0
      ? payload.venue_type
      : Array.from(new Set([payload.business_category, ...secondaryCategories].filter(Boolean)));

  const venue = await Venue.create({
    owner_id: payload.owner_id,
    hall_name: payload.hall_name,
    owner_name: payload.owner_name,
    phone: payload.phone,
    city: payload.city,
    address: payload.address,
    google_maps_link: payload.google_maps_link,
    capacity: payload.capacity,
    venue_type: venueTypes,
    business_category: payload.business_category,
    secondary_categories: secondaryCategories,
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

    if (Number(plan.monthly_price) > 0) {
      // Paid plan — intentionally skip creating a subscription here.
      // The vendor must complete Cashfree checkout first; the subscription
      // is only created in payment.controller.verifyPayment after Cashfree
      // confirms the order as PAID. This now matches the frontend's
      // needsPayment check, which no longer looks at trial_days.
    } else {
      await createSubscription(venue.id, payload.plan_id);
    }
  } else {
    await createFreeSubscription(venue.id);
  }

  return venue;
}

/**
 * Finds an existing venue_owner account by email, or creates a new one.
 * No password_hash and no google_id are set  - the account sits "unclaimed"
 * until the real vendor signs in with Google using this same email, at
 * which point google.strategy.js links it automatically (it already looks
 * up by email when google_id isn't found).
 */
async function findOrCreateOwnerByEmail(email, name) {
  const normalizedEmail = String(email).toLowerCase().trim();
  let user = await User.findOne({ where: { email: normalizedEmail } });

  if (user) {
    if (user.role !== "venue_owner") {
      throw new AppError("This email is already registered as a different type of account.", 409);
    }
    if (!user.is_active) {
      throw new AppError("This email belongs to a deactivated account.", 409);
    }
    return user;
  }

  return User.create({
    name: name && name.trim() ? name.trim() : normalizedEmail.split("@")[0],
    email: normalizedEmail,
    role: "venue_owner"
  });
}

/**
 * Super-admin creates a vendor + venue on the vendor's behalf, using only
 * the vendor's email  - no password/Google login needed from the vendor at
 * this point. Reuses the normal createVenue() so the resulting venue is
 * identical (subdomain, default sections, free trial subscription) to one
 * a vendor would have made themselves.
 *
 * Idempotent by email: if this vendor already has a venue (an earlier admin
 * submission succeeded, or the vendor already signed up on their own),
 * this does NOT error out  - it just hands back their existing venue so
 * "Add Vendor" behaves like "Open vendor" instead of dead-ending.
 */
async function adminCreateVenue(payload) {
  const { owner_email, owner_name, ...venuePayload } = payload;

  if (!owner_email) {
    throw new AppError("Vendor email is required", 400);
  }
  if (!venuePayload.hall_name) {
    throw new AppError("Business/venue name is required", 400);
  }

  const owner = await findOrCreateOwnerByEmail(owner_email, owner_name);

  const existingVenue = await Venue.findOne({ where: { owner_id: owner.id } });
  if (existingVenue) {
    return {
      venue: existingVenue,
      owner: { id: owner.id, name: owner.name, email: owner.email },
      already_existed: true
    };
  }

  const venue = await createVenue({
    ...venuePayload,
    owner_name: owner_name || venuePayload.owner_name,
    owner_id: owner.id
  });

  return {
    venue,
    owner: { id: owner.id, name: owner.name, email: owner.email },
    already_existed: false
  };
}

/**
 * Issues a short-lived access token for the venue's owner so a super_admin
 * can open the vendor dashboard exactly as the vendor would see it, without
 * ever having (or needing) the vendor's password.
 */
async function impersonateVenueOwner(venueId, adminUser) {
  const venue = await Venue.findByPk(venueId, {
    include: [{ model: User, as: "owner" }]
  });
  if (!venue) throw new AppError("Venue not found", 404);

  const owner = venue.owner;
  if (!owner) throw new AppError("This venue has no owner account", 404);
  if (!owner.is_active) throw new AppError("This vendor's account is deactivated", 403);

  const { generateImpersonationToken } = require("../auth/jwt.service");
  const accessToken = generateImpersonationToken(owner, adminUser.id);

  // Lightweight audit trail  - who impersonated whom, and when.
  console.log(
    `[IMPERSONATION] admin=${adminUser.email} (${adminUser.id}) -> owner=${owner.email} (${owner.id}) venue=${venue.id} at=${new Date().toISOString()}`
  );

  return {
    accessToken,
    venue: { id: venue.id, hall_name: venue.hall_name },
    owner: { id: owner.id, name: owner.name, email: owner.email }
  };
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
    "hero_heading", "hero_subheading",
    "meta_title", "meta_description",
    // Website builder fields (dropped by mistake in the R2 update commit)
    "template_id", "theme_color", "hero_button_text",
    "about_highlights", "testimonials", "show_pricing_section"
  ];

  if (updates.secondary_categories !== undefined) {
    const primaryCategory = updates.business_category !== undefined ? updates.business_category : venue.business_category;
    updates.secondary_categories = await sanitizeSecondaryCategories(updates.secondary_categories, primaryCategory);
  }

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

  const compressed = await compressBuffer(file.buffer, file.mimetype, { maxWidth: 1920, quality: 78 });

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

async function deleteGalleryImage(venueId, ownerId, imageId) {
  const venue = await Venue.findOne({ where: { id: venueId, owner_id: ownerId } });
  if (!venue) throw new AppError("Venue not found or access denied", 404);

  const existing = venue.gallery || [];
  const filtered = existing.filter((img) => String(img.id) !== String(imageId));

  if (filtered.length === existing.length) {
    throw new AppError("Image not found in gallery", 404);
  }

  venue.gallery = filtered;
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

async function getPublicVenueBySubdomain(subdomain) {
  const venue = await Venue.findOne({
    where: {
      subdomain,
      is_active: true
      // is_live check removed for dev; add back in production
    }
  });

  if (!venue) {
    throw new AppError("Venue not found", 404);
  }

  venue.setDataValue("page_sections", normalizeSections(venue));
  return venue;
}

async function getVenueBySubdomainForPreview(subdomain) {
  const venue = await Venue.findOne({ where: { subdomain } });

  if (!venue) {
    throw new AppError("Venue not found", 404);
  }

  venue.setDataValue("page_sections", normalizeSections(venue));
  return venue;
}

async function listAllVenues(query = {}) {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 50;
  const offset = (page - 1) * limit;

  const where = {};

  if (query.search) {
    where[Op.or] = [
      { hall_name: { [Op.iLike]: `%${query.search}%` } },
      { subdomain: { [Op.iLike]: `%${query.search}%` } },
      { city: { [Op.iLike]: `%${query.search}%` } }
    ];
  }

  if (query.city) where.city = query.city;
  if (query.business_category) where.business_category = query.business_category;
  if (query.is_active !== undefined) where.is_active = query.is_active === "true" || query.is_active === true;

  const { rows, count } = await Venue.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [
      { model: Subscription, as: "subscription", include: [{ model: Plan, as: "plan" }] },
      { model: User, as: "owner", attributes: ["id", "email"] }
    ]
  });

  return {
    venues: rows,
    pagination: {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit)
    }
  };
}

async function toggleVenueActive(venueId, isActive) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) throw new AppError("Venue not found", 404);

  venue.is_active = !!isActive;
  await venue.save();
  return venue;
}

async function deleteVenue(venueId) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) throw new AppError("Venue not found", 404);

  await venue.destroy();
  return true;
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

  venue.setup_completed_steps = steps;
  await venue.save();
}

module.exports = {
  createVenue,
  adminCreateVenue,
  impersonateVenueOwner,
  getVenueById,
  getVenuesByOwner,
  updateVenue,
  uploadHeroImage,
  addGalleryImages,
  deleteGalleryImage,
  uploadSectionImage,
  recalculateSetupChecklist,
  getPublicVenueBySubdomain,
  getVenueBySubdomainForPreview,
  listAllVenues,
  toggleVenueActive,
  deleteVenue
};