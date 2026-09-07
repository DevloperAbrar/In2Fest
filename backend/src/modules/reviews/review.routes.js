const express = require("express");
const controller = require("./review.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authenticatePublicUser, identifyReviewer } = require("../../middleware/publicAuth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { publicInquiryLimiter } = require("../../middleware/rateLimiter.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");

const router = express.Router();

// Public  - manual marketplace review submission. Reviewer must be signed in
// (public visitor account OR vendor account)  - identifyReviewer handles both.
router.post("/submit", publicInquiryLimiter, identifyReviewer, controller.submit);

// Public  - post-booking review via unique token link (no OTP)
router.post("/token/:token", publicInquiryLimiter, controller.submitViaToken);

// Public  - fetch approved reviews for a venue
router.get("/venue/:venueId", controller.getByVenue);

// Signed-in visitor  - their own review history
router.get("/mine", authenticatePublicUser, controller.mine);
router.put("/:reviewId/mine", authenticatePublicUser, controller.updateMine);
router.delete("/:reviewId/mine", authenticatePublicUser, controller.deleteMine);

// Vendor auth  - reviews they've given to other venues
// Owner auth ONLY  - reviews *they personally* wrote about other vendors.
// Tied to the owner's own account identity, not delegable venue data.
router.get("/given", authenticate, requireRole("venue_owner"), controller.given);
router.put("/:reviewId/given", authenticate, requireRole("venue_owner"), controller.updateGiven);
router.delete("/:reviewId/given", authenticate, requireRole("venue_owner"), controller.deleteGiven);

// Vendor auth  - see and self-moderate every review on their own venue
router.get("/owner/:venueId", authenticate, requireRole("venue_owner", "team_member"), requireTeamPermission("reviews"), controller.ownerGetByVenue);
router.put("/:reviewId/owner-approve", authenticate, requireRole("venue_owner", "team_member"), requireTeamPermission("reviews"), controller.ownerApprove);
router.delete("/:reviewId/owner", authenticate, requireRole("venue_owner", "team_member"), requireTeamPermission("reviews"), controller.ownerDelete);

// Vendor auth  - reply to a review
router.post("/:reviewId/reply", authenticate, requireRole("venue_owner", "team_member"), requireTeamPermission("reviews"), controller.reply);

// Super Admin  - moderation queue
router.get("/admin/pending", authenticate, requireRole("super_admin"), controller.adminPending);
router.put("/admin/:reviewId/approve", authenticate, requireRole("super_admin"), controller.adminApprove);
router.put("/admin/:reviewId/reject", authenticate, requireRole("super_admin"), controller.adminReject);

module.exports = router;