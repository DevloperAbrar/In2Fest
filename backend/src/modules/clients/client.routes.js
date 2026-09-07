const express = require("express");
const controller = require("./client.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");

const router = express.Router({ mergeParams: true });

router.use(
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("clients"),
  requireTeamPermission("clients")
);

router.post("/", controller.createClient);
router.get("/", controller.getClients);
router.get("/:clientId", controller.getClient);
router.patch("/:clientId", controller.updateClient);
router.delete("/:clientId", controller.deleteClient);

module.exports = router;