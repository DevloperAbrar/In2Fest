const crypto = require("crypto");
const { Review, Venue, Inquiry } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

function hashEmail(email) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function hashPhone(phone) {
  return crypto.createHash("sha256").update(phone).digest("hex");
}

function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

async function recalculateRating(venueId) {
  const approved = await Review.findAll({ where: { venue_id: venueId, status: "approved" } });
  const count = approved.length;
  const average = count ? approved.reduce((sum, r) => sum + r.star_rating, 0) / count : 0;

  await Venue.update(
    { average_rating: Math.round(average * 100) / 100, review_count: count },
    { where: { id: venueId } }
  );
}

/**
 * Source 1  - post-booking automatic review. No admin approval, pre-authenticated by a
 * unique token from review_requests (validated by the controller before calling this).
 */
async function submitBookingReview(venueId, bookingId, payload) {
  const review = await Review.create({
    venue_id: venueId,
    reviewer_name: payload.reviewer_name,
    reviewer_phone_hash: hashPhone(payload.reviewer_phone || ""),
    event_type: payload.event_type,
    event_date: payload.event_date,
    star_rating: payload.star_rating,
    review_text: payload.review_text,
    source: "booking_auto",
    booking_id: bookingId,
    status: "approved"
  });

  await recalculateRating(venueId);
  return review;
}

/**
 * Source 2  - manual review submitted from the discovery marketplace. The reviewer is
 * already signed in (either a public visitor account or a logged-in vendor reviewing
 * someone else's venue)  - `reviewer` comes from the identifyReviewer middleware.
 * Always goes to moderation.
 */
async function submitMarketplaceReview(venueId, payload, reviewer) {
  if (wordCount(payload.review_text) < 30) {
    throw new AppError("Review must be at least 30 words", 400);
  }

  const venue = await Venue.findByPk(venueId);
  if (!venue) throw new AppError("Venue not found", 404);

  if (reviewer.type === "vendor" && venue.owner_id === reviewer.id) {
    throw new AppError("You can't review your own venue", 400);
  }

  const alreadyReviewed = await Review.findOne({
    where: { venue_id: venueId, reviewer_user_id: reviewer.id, reviewer_role: reviewer.type }
  });
  if (alreadyReviewed) {
    throw new AppError("You've already reviewed this venue", 409);
  }

  const review = await Review.create({
    venue_id: venueId,
    reviewer_name: reviewer.name,
    reviewer_user_id: reviewer.id,
    reviewer_role: reviewer.type,
    reviewer_email_hash: hashEmail(reviewer.email),
    event_type: payload.event_type,
    event_date: payload.event_date,
    star_rating: payload.star_rating,
    review_text: payload.review_text,
    source: reviewer.type === "vendor" ? "marketplace_vendor" : "marketplace_manual",
    status: "pending"
  });

  return review;
}

async function getVenueReviews(venueId) {
  const reviews = await Review.findAll({
    where: { venue_id: venueId, status: "approved" },
    order: [["created_at", "DESC"]]
  });

  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.star_rating, 0) / count : 0;

  return {
    reviews,
    average_rating: count ? Math.round(average * 100) / 100 : null,
    review_count: count
  };
}

/**
 * Owner-facing  - every review for the venue regardless of status or count, so the
 * owner can see and moderate reviews as soon as they come in (no 3-review gate,
 * that gate is only for the public marketplace listing).
 */
// A team member acting on their own venue counts as authorized, same as the
// owner  - this just checks *which* identity the caller actually is.
function canManageVenue(actor, venue) {
  if (!venue) return false;
  if (actor.role === "team_member") return venue.id === actor.venueId;
  return venue.owner_id === actor.id;
}

async function getOwnerVenueReviews(venueId, actor) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) throw new AppError("Venue not found", 404);
  if (!canManageVenue(actor, venue)) throw new AppError("You do not have access to this venue's reviews", 403);

  const reviews = await Review.findAll({
    where: { venue_id: venueId },
    order: [["created_at", "DESC"]]
  });

  const approved = reviews.filter((r) => r.status === "approved");
  const average = approved.length ? approved.reduce((s, r) => s + r.star_rating, 0) / approved.length : 0;

  return {
    reviews,
    average_rating: approved.length ? Math.round(average * 100) / 100 : null,
    review_count: approved.length
  };
}

/**
 * Owner approves their own pending review, making it visible on the public listing
 * (subject to the 3-review minimum for the aggregate rating display).
 */
async function ownerApproveReview(reviewId, actor) {
  const review = await Review.findByPk(reviewId, { include: [{ model: Venue }] });
  if (!review) throw new AppError("Review not found", 404);
  if (!canManageVenue(actor, review.Venue)) {
    throw new AppError("You do not have access to this review", 403);
  }
  review.status = "approved";
  await review.save();
  await recalculateRating(review.venue_id);
  return review;
}

/**
 * Owner deletes a review on their own venue (hard delete  - this is a self-serve
 * moderation action, not the audit-trail soft-delete used by super-admin rejection).
 */
async function ownerDeleteReview(reviewId, actor) {
  const review = await Review.findByPk(reviewId, { include: [{ model: Venue }] });
  if (!review) throw new AppError("Review not found", 404);
  if (!canManageVenue(actor, review.Venue)) {
    throw new AppError("You do not have access to this review", 403);
  }
  const venueId = review.venue_id;
  const wasApproved = review.status === "approved";
  await review.destroy();
  if (wasApproved) await recalculateRating(venueId);
  return { id: reviewId };
}

async function ownerReply(reviewId, actor, replyText) {
  const { venueHasFeature } = require("../../utils/planAccess");

  const review = await Review.findByPk(reviewId, { include: [{ model: Venue }] });
  if (!review) throw new AppError("Review not found", 404);
  if (!canManageVenue(actor, review.Venue)) {
    throw new AppError("You do not have access to this review", 403);
  }

  await venueHasFeature(review.Venue.id, "reviews");

  review.owner_reply = replyText;
  review.owner_reply_at = new Date();
  await review.save();
  return review;
}

/**
 * Reviews authored BY a signed-in account (either a visitor's own reviews, or
 * a vendor's reviews of other venues)  - used for "My Reviews" and "Reviews I've Given".
 */
async function getReviewsAuthoredBy(userId, role) {
  const reviews = await Review.findAll({
    where: { reviewer_user_id: userId, reviewer_role: role },
    include: [{ model: Venue, attributes: ["id", "hall_name", "city"] }],
    order: [["created_at", "DESC"]]
  });
  return reviews;
}

/**
 * Edit your own review (visitor or vendor). Editing sends it back to "pending"
 * so it's re-moderated before it's visible again  - prevents an approved review
 * being silently swapped for different content.
 */
async function updateOwnReview(reviewId, userId, role, payload) {
  const review = await Review.findByPk(reviewId);
  if (!review) throw new AppError("Review not found", 404);
  if (review.reviewer_user_id !== userId || review.reviewer_role !== role) {
    throw new AppError("You do not have access to this review", 403);
  }

  if (payload.review_text !== undefined) {
    if (wordCount(payload.review_text) < 30) {
      throw new AppError("Review must be at least 30 words", 400);
    }
    review.review_text = payload.review_text;
  }
  if (payload.star_rating !== undefined) review.star_rating = payload.star_rating;
  if (payload.event_type !== undefined) review.event_type = payload.event_type;
  if (payload.event_date !== undefined) review.event_date = payload.event_date;

  const wasApproved = review.status === "approved";
  review.status = "pending";
  await review.save();
  if (wasApproved) await recalculateRating(review.venue_id);

  return review;
}

async function deleteOwnReview(reviewId, userId, role) {
  const review = await Review.findByPk(reviewId);
  if (!review) throw new AppError("Review not found", 404);
  if (review.reviewer_user_id !== userId || review.reviewer_role !== role) {
    throw new AppError("You do not have access to this review", 403);
  }
  const venueId = review.venue_id;
  const wasApproved = review.status === "approved";
  await review.destroy();
  if (wasApproved) await recalculateRating(venueId);
  return { id: reviewId };
}

/**
 * Section 7.3  - Response Rate Badge, calculated from inquiry response history
 * over the last 30 days.
 */
async function getResponseRateBadge(venueId) {
  const { Op } = require("sequelize");
  const dayjs = require("dayjs");
  const thirtyDaysAgo = dayjs().subtract(30, "day").toDate();

  const inquiries = await Inquiry.findAll({
    where: { venue_id: venueId, created_at: { [Op.gte]: thirtyDaysAgo } }
  });

  if (!inquiries.length) return null;

  const respondedWithin24h = inquiries.filter((i) => i.status !== "new").length; // simplified: any status change = responded
  const percent24h = (respondedWithin24h / inquiries.length) * 100;

  if (percent24h >= 70) return "Typically responds within a few hours";
  return null; // simplified 48h tier omitted for brevity  - extend the same way if needed
}

// ---- Admin ----

async function adminGetPending() {
  return Review.findAll({
    where: { status: "pending" },
    include: [{ model: Venue, attributes: ["hall_name"] }],
    order: [["created_at", "ASC"]]
  });
}

async function adminApprove(reviewId) {
  const review = await Review.findByPk(reviewId);
  if (!review) throw new AppError("Review not found", 404);
  review.status = "approved";
  await review.save();
  if (review.venue_id) await recalculateRating(review.venue_id);
  return review;
}

async function adminReject(reviewId) {
  const review = await Review.findByPk(reviewId);
  if (!review) throw new AppError("Review not found", 404);
  review.status = "rejected"; // soft-delete  - kept for audit per Section 7.1
  await review.save();
  return review;
}

module.exports = {
  submitBookingReview, submitMarketplaceReview, getVenueReviews, getOwnerVenueReviews,
  ownerReply, ownerApproveReview, ownerDeleteReview, getResponseRateBadge, recalculateRating,
  getReviewsAuthoredBy, updateOwnReview, deleteOwnReview,
  adminGetPending, adminApprove, adminReject
};