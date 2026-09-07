const express = require("express");
const controller = require("./marketplaceProfile.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

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

module.exports = router;