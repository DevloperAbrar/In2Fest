const express = require("express");
const controller = require("./venue.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { upload } = require("../../middleware/upload.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");

const router = express.Router();

// Public (no auth)  - used by the public venue website
router.get("/public/:subdomain", controller.getPublicVenue);

// Preview (auth required)  - owner can preview their own venue even if not is_live yet
router.get("/preview/:subdomain", authenticate, controller.previewVenue);

// Venue Owner
router.post("/", authenticate, requireRole("venue_owner"), controller.createVenue);
router.get("/my", authenticate, requireRole("venue_owner"), controller.getMyVenues);

router.post(
  "/:id/hero-image",
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("website_builder"),
  requireTeamPermission("website_builder"),
  upload.single("heroImage"),
  controller.uploadHeroImage
);
router.post(
  "/:id/gallery",
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("website_builder"),
  requireTeamPermission("website_builder"),
  upload.array("galleryImages", 20),
  controller.addGalleryImages
);
router.post(
  "/:id/section-image",
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("website_builder"),
  requireTeamPermission("website_builder"),
  upload.single("sectionImage"),
  controller.uploadSectionImage
);
router.delete(
  "/:id/gallery/:imageId",
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("website_builder"),
  requireTeamPermission("website_builder"),
  controller.deleteGalleryImage
);

// Shared (owner or admin can view)  - ownership enforced by requireVenueOwnership
router.get("/:id", authenticate, requireVenueOwnership, controller.getVenue);
router.patch("/:id", authenticate, requireVenueOwnership, requireRole("venue_owner"), controller.updateVenue);

// Super Admin only
router.get("/", authenticate, requireRole("super_admin"), controller.listAllVenues);
router.patch("/:id/status", authenticate, requireRole("super_admin"), controller.toggleVenueActive);
router.delete("/:id", authenticate, requireRole("super_admin"), controller.deleteVenue);

module.exports = router;