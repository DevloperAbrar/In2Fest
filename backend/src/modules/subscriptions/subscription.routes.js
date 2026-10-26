const express = require("express");
const controller = require("./subscription.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { AppError } = require("../../middleware/error.middleware");
const { Venue } = require("../../database/models");

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /subscriptions carries the venue in the body, so the owner check reads it from there.
async function requireOwnVenueInBody(req, res, next) {
  try {
    const venueId = req.body && req.body.venueId;
    if (!venueId || !UUID_RE.test(String(venueId))) {
      return next(new AppError("A valid venueId is required", 400));
    }
    const venue = await Venue.findOne({ where: { id: venueId, owner_id: req.user.id }, attributes: ["id"] });
    if (!venue) return next(new AppError("Venue not found or access denied", 404));
    next();
  } catch (error) {
    next(error);
  }
}

router.post("/", authenticate, requireRole("venue_owner"), requireOwnVenueInBody, controller.createSubscription);
router.get("/:venueId", authenticate, requireVenueOwnership, controller.getMySubscription);
router.patch("/:venueId/change-plan", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.changePlan);

// Super Admin controls
router.patch("/:venueId/admin-assign", authenticate, requireRole("super_admin"), controller.adminAssignPlan);
router.patch("/:venueId/extend-trial", authenticate, requireRole("super_admin"), controller.extendTrial);
router.patch("/:venueId/suspend", authenticate, requireRole("super_admin"), controller.suspendSubscription);
router.patch("/:venueId/reactivate", authenticate, requireRole("super_admin"), controller.reactivateSubscription);

module.exports = router;