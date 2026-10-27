const express = require("express");
const controller = require("./dashboard.controller");
const overview = require("./dashboard.overview.service");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");

const router = express.Router();

// ---------- Venue Owner ----------
router.get("/owner/:venueId/summary", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getOwnerSummary);
router.get("/owner/:venueId/overview", authenticate, requireRole("venue_owner"), requireVenueOwnership, overview.getOwnerOverview);

// ---------- Super Admin ----------
router.get("/admin/summary", authenticate, requireRole("super_admin"), controller.getAdminSummary);

module.exports = router;