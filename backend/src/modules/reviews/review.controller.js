const reviewService = require("./review.service");
const { ReviewRequest } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

async function submit(req, res, next) {
  try {
    const review = await reviewService.submitMarketplaceReview(req.body.venue_id, req.body, req.reviewer);
    res.status(201).json({ success: true, message: "Review submitted for approval", data: { id: review.id } });
  } catch (error) {
    next(error);
  }
}

// Pre-authenticated via unique token (from the post-booking WhatsApp link)  - no OTP needed
async function submitViaToken(req, res, next) {
  try {
    const { token } = req.params;
    const request = await ReviewRequest.findOne({ where: { review_token: token, review_submitted: false } });
    if (!request) throw new AppError("This review link is invalid or has already been used", 404);

    const review = await reviewService.submitBookingReview(request.venue_id, request.booking_id, req.body);

    request.review_submitted = true;
    await request.save();

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

async function getByVenue(req, res, next) {
  try {
    const result = await reviewService.getVenueReviews(req.params.venueId);
    const responseRateBadge = await reviewService.getResponseRateBadge(req.params.venueId);
    res.json({ success: true, data: { ...result, response_rate_badge: responseRateBadge } });
  } catch (error) {
    next(error);
  }
}

// Owner  - every review on their venue, any status, so they can see and moderate immediately
async function ownerGetByVenue(req, res, next) {
  try {
    const result = await reviewService.getOwnerVenueReviews(req.params.venueId, req.user);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function ownerApprove(req, res, next) {
  try {
    const review = await reviewService.ownerApproveReview(req.params.reviewId, req.user);
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

async function ownerDelete(req, res, next) {
  try {
    const result = await reviewService.ownerDeleteReview(req.params.reviewId, req.user);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function reply(req, res, next) {
  try {
    const review = await reviewService.ownerReply(req.params.reviewId, req.user, req.body.reply_text);
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

// Signed-in visitor  - their own review history
async function mine(req, res, next) {
  try {
    const reviews = await reviewService.getReviewsAuthoredBy(req.publicUser.id, "visitor");
    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
}

async function updateMine(req, res, next) {
  try {
    const review = await reviewService.updateOwnReview(req.params.reviewId, req.publicUser.id, "visitor", req.body);
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

async function deleteMine(req, res, next) {
  try {
    const result = await reviewService.deleteOwnReview(req.params.reviewId, req.publicUser.id, "visitor");
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// Vendor  - reviews THEY have given to other venues
async function given(req, res, next) {
  try {
    const reviews = await reviewService.getReviewsAuthoredBy(req.user.id, "vendor");
    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
}

async function updateGiven(req, res, next) {
  try {
    const review = await reviewService.updateOwnReview(req.params.reviewId, req.user.id, "vendor", req.body);
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

async function deleteGiven(req, res, next) {
  try {
    const result = await reviewService.deleteOwnReview(req.params.reviewId, req.user.id, "vendor");
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// Admin
async function adminPending(req, res, next) {
  try {
    const reviews = await reviewService.adminGetPending();
    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
}

async function adminApprove(req, res, next) {
  try {
    const review = await reviewService.adminApprove(req.params.reviewId);
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

async function adminReject(req, res, next) {
  try {
    const review = await reviewService.adminReject(req.params.reviewId);
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submit, submitViaToken, getByVenue, ownerGetByVenue, reply, ownerApprove, ownerDelete,
  mine, updateMine, deleteMine, given, updateGiven, deleteGiven,
  adminPending, adminApprove, adminReject
};