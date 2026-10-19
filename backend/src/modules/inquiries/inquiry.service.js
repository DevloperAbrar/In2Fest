const { Inquiry, Venue } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { sendWhatsApp } = require("../whatsapp/whatsapp.service");
const { verifyGoogleIdToken } = require("../../utils/googleIdToken");
const { getActiveFeatures } = require("../../utils/planAccess");

const VALID_TRANSITIONS = {
  new: ["contacted", "lost"],
  contacted: ["negotiating", "lost"],
  negotiating: ["advance_received", "lost"],
  advance_received: ["confirmed", "lost"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  lost: []
};

// Vendors that are not event businesses can skip the date. The column is NOT NULL,
// so an empty date is saved as the day the enquiry was sent.
const inquiryDate = (value) => value || new Date().toISOString().slice(0, 10);

// The quantity / guest box is optional for some businesses. An empty box sends "",
// which an integer column rejects, so it is saved as null instead.
const inquiryCount = (value) => (value === "" || value === undefined ? null : value);

async function createPublicInquiry(venueId, payload) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) throw new AppError("Venue not found", 404);

  const features = await getActiveFeatures(venueId);
  if (!features.includes("inquiries")) {
    throw new AppError("This vendor is not accepting online inquiries right now. Please contact them directly.", 403);
  }
  const slotsEnabled = features.includes("slots");

  const eventDate = inquiryDate(payload.event_date);

  const inquiry = await Inquiry.create({
    venue_id: venueId,
    slot_id: slotsEnabled ? payload.slot_id || null : null,
    selected_slots: slotsEnabled && Array.isArray(payload.selected_slots) ? payload.selected_slots : [],
    customer_name: payload.customer_name,
    phone: payload.phone,
    email: payload.email,
    event_date: eventDate,
    event_type: payload.event_type,
    guest_count: inquiryCount(payload.guest_count),
    message: payload.message,
    status: "new"
  });

  sendWhatsApp({
    venueId,
    recipientPhone: venue.phone,
    triggerType: "new_inquiry",
    variables: { customerName: payload.customer_name, eventDate: eventDate }
  }).catch((err) => console.error("[WHATSAPP] Failed to notify owner of new inquiry:", err.message));

  return inquiry;
}

async function getInquiriesByVenue(venueId, filters = {}) {
  const where = { venue_id: venueId };
  if (filters.status) where.status = filters.status;
  if (filters.event_type) where.event_type = filters.event_type;

  return Inquiry.findAll({ where, order: [["created_at", "DESC"]] });
}

async function getInquiryById(inquiryId, venueId) {
  const inquiry = await Inquiry.findOne({ where: { id: inquiryId, venue_id: venueId } });
  if (!inquiry) throw new AppError("Inquiry not found", 404);
  return inquiry;
}

async function updateInquiryStatus(inquiryId, venueId, newStatus) {
  const inquiry = await getInquiryById(inquiryId, venueId);

  const allowed = VALID_TRANSITIONS[inquiry.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(`Cannot move inquiry from '${inquiry.status}' to '${newStatus}'`, 400);
  }

  inquiry.status = newStatus;
  await inquiry.save();
  return inquiry;
}

async function updateInternalNotes(inquiryId, venueId, notes) {
  const inquiry = await getInquiryById(inquiryId, venueId);
  inquiry.internal_notes = notes;
  await inquiry.save();
  return inquiry;
}

/**
 * Called from the DISCOVERY MARKETPLACE inquiry modal - requires Google auth.
 */
async function createMarketplaceInquiry(venueId, payload) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) throw new AppError("Venue not found", 404);

  // Plan check BEFORE the Google verification, so no work is done for a vendor
  // that cannot receive inquiries.
  const features = await getActiveFeatures(venueId);
  if (!features.includes("inquiries")) {
    throw new AppError("This vendor is not accepting online inquiries right now. Please contact them directly.", 403);
  }
  const slotsEnabled = features.includes("slots");

  let googleUser;
  try {
    googleUser = await verifyGoogleIdToken(payload.google_credential);
  } catch {
    throw new AppError("Google verification failed. Please sign in with Google again.", 401);
  }
  if (!googleUser || !googleUser.email) {
    throw new AppError("Google verification required.", 401);
  }

  const selectedSlots = slotsEnabled && Array.isArray(payload.selected_slots) ? payload.selected_slots : [];

  const eventDate = inquiryDate(payload.event_date);

  const inquiry = await Inquiry.create({
    venue_id: venueId,
    slot_id: selectedSlots[0]?.slot_id || null,
    selected_slots: selectedSlots,
    customer_name: payload.customer_name,
    phone: payload.phone,
    // Use verified Google email — payload.email is empty when signed in with Google
    email: googleUser.email,
    event_date: eventDate,
    event_type: payload.event_type,
    guest_count: inquiryCount(payload.guest_count),
    message: payload.message,
    status: "new",
    source: "marketplace"
  });

  // .catch added: the server shuts down on any unhandled rejection, so a failed
  // WhatsApp send must never be left un-caught.
  sendWhatsApp({
    venueId,
    recipientPhone: venue.phone,
    triggerType: "marketplace_inquiry_to_vendor",
    variables: { customerName: payload.customer_name, eventType: payload.event_type, date: eventDate }
  }).catch((err) => console.error("[WHATSAPP] Failed to notify owner of marketplace inquiry:", err.message));

  return inquiry;
}

module.exports = {
  createPublicInquiry,
  getInquiriesByVenue,
  getInquiryById,
  updateInquiryStatus,
  updateInternalNotes,
  createMarketplaceInquiry
};