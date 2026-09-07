const express = require("express");
const controller = require("./inquiry.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { publicInquiryLimiter } = require("../../middleware/rateLimiter.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");

const router = express.Router({ mergeParams: true });

// Public  - inquiry form submission from venue website
router.post("/", publicInquiryLimiter, controller.createPublicInquiry);
router.post("/marketplace", publicInquiryLimiter, controller.createMarketplaceInquiry);

// Venue Owner (dashboard)
router.use(
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("inquiries"),
  requireTeamPermission("inquiries")
);

router.get("/", controller.getInquiries);
router.get("/:inquiryId", controller.getInquiry);
router.patch("/:inquiryId/status", controller.updateStatus);
router.patch("/:inquiryId/notes", controller.updateNotes);

module.exports = router;