const { VendorListing, City, Category } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { sendWhatsApp } = require("../whatsapp/whatsapp.service");
const { getRazorpayInstance } = require("../../config/razorpay");
const env = require("../../config/env");

const MILESTONES = [100, 500, 1000];

function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

async function registerFreeListing(payload) {
  if (wordCount(payload.about) < 50) {
    throw new AppError("About section must be at least 50 words", 400);
  }
  if ((payload.photos || []).length > 5) {
    throw new AppError("You can upload up to 5 photos", 400);
  }

  const listing = await VendorListing.create({
    business_name: payload.business_name,
    owner_name: payload.owner_name,
    phone: payload.phone,
    whatsapp_number: payload.whatsapp_number,
    city_id: payload.city_id,
    locality: payload.locality,
    category_id: payload.category_id,
    starting_price: payload.starting_price || null,
    about: payload.about,
    photos: payload.photos || [],
    status: "pending"
  });

  sendWhatsApp({
    recipientPhone: listing.whatsapp_number || listing.phone,
    triggerType: "free_listing_registered",
    variables: { name: listing.owner_name }
  });

  return listing;
}

async function getPublicListing(id) {
  const listing = await VendorListing.findOne({
    where: { id, status: "active" },
    include: [{ model: City, as: "cityRef" }, { model: Category, as: "categoryRef" }]
  });
  if (!listing) throw new AppError("Listing not found", 404);
  return listing;
}

async function incrementProfileView(id) {
  const listing = await VendorListing.findByPk(id);
  if (!listing) return;

  listing.profile_views += 1;

  const nextMilestone = MILESTONES.find(
    (m) => listing.profile_views >= m && listing.last_milestone_notified < m
  );

  if (nextMilestone) {
    listing.last_milestone_notified = nextMilestone;
    sendWhatsApp({
      recipientPhone: listing.whatsapp_number || listing.phone,
      triggerType: "free_listing_milestone",
      variables: { name: listing.owner_name, views: listing.profile_views }
    });
  }

  await listing.save();
}

async function incrementInquiryCount(id) {
  await VendorListing.increment("inquiry_count", { where: { id } });
}

// ---- Admin ----

async function adminListAll(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  return VendorListing.findAll({
    where,
    include: [{ model: City, as: "cityRef" }, { model: Category, as: "categoryRef" }],
    order: [["created_at", "DESC"]]
  });
}

async function adminApprove(id) {
  const listing = await VendorListing.findByPk(id);
  if (!listing) throw new AppError("Listing not found", 404);
  listing.status = "active";
  await listing.save();

  sendWhatsApp({
    recipientPhone: listing.whatsapp_number || listing.phone,
    triggerType: "free_listing_approved",
    variables: { name: listing.owner_name, listingLink: `https://${env.baseDomain}/listing/${listing.id}` }
  });

  return listing;
}

async function adminReject(id) {
  const listing = await VendorListing.findByPk(id);
  if (!listing) throw new AppError("Listing not found", 404);
  listing.status = "rejected";
  await listing.save();
  return listing;
}

async function sendUpgradeLink(id) {
  const listing = await VendorListing.findByPk(id);
  if (!listing) throw new AppError("Listing not found", 404);

  const razorpay = getRazorpayInstance();
  if (!razorpay) throw new AppError("Payment gateway not configured", 503);

  const paymentLink = await razorpay.paymentLink.create({
    amount: 99900, // ₹999 starter plan  - adjust as needed, or fetch dynamically from Plan model
    currency: "INR",
    description: `In2Fest SaaS upgrade for ${listing.business_name}`,
    customer: { name: listing.owner_name, contact: listing.phone },
    notify: { sms: true, whatsapp: true },
    notes: { vendor_listing_id: String(listing.id) }
  });

  sendWhatsApp({
    recipientPhone: listing.whatsapp_number || listing.phone,
    triggerType: "upgrade_link",
    variables: { name: listing.owner_name, paymentLink: paymentLink.short_url }
  });

  return { paymentLink: paymentLink.short_url };
}

module.exports = {
  registerFreeListing,
  getPublicListing,
  incrementProfileView,
  incrementInquiryCount,
  adminListAll,
  adminApprove,
  adminReject,
  sendUpgradeLink
};