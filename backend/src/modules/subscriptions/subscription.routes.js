const express = require("express");
const controller = require("./subscription.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.post("/", authenticate, requireRole("venue_owner"), controller.createSubscription);
router.get("/:venueId", authenticate, controller.getMySubscription);
router.patch("/:venueId/change-plan", authenticate, requireRole("venue_owner"), controller.changePlan);

// Super Admin controls
router.patch("/:venueId/extend-trial", authenticate, requireRole("super_admin"), controller.extendTrial);
router.patch("/:venueId/suspend", authenticate, requireRole("super_admin"), controller.suspendSubscription);
router.patch("/:venueId/reactivate", authenticate, requireRole("super_admin"), controller.reactivateSubscription);

module.exports = router;