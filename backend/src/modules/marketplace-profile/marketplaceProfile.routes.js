const express = require("express");
const controller = require("./marketplaceProfile.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { upload } = require("../../middleware/upload.middleware");

const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");

const router = express.Router({ mergeParams: true });

router.use(
  authenticate,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("marketplace_profile"),
  requireTeamPermission("marketplace_profile")
);
router.get("/", controller.getProfile);
router.put("/", controller.updateProfile);
router.put("/service-areas", controller.updateServiceAreas);
router.get("/completion", controller.getCompletion);

// Hero image + up to 4 gallery photos for free listing vendors.
// The service refuses these when the vendor's plan includes the website builder.
router.post("/photos/hero", upload.single("heroImage"), controller.uploadHeroPhoto);
router.post("/photos/gallery", upload.array("galleryImages", 4), controller.addGalleryPhotos);
router.delete("/photos/gallery/:imageId", controller.deleteGalleryPhoto);

module.exports = router;