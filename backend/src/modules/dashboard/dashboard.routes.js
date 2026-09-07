const express = require("express");
const controller = require("./dashboard.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

// ---------- Venue Owner ----------
router.get("/owner/:venueId/summary", authenticate, requireRole("venue_owner"), controller.getOwnerSummary);

// ---------- Super Admin ----------
router.get("/admin/summary", authenticate, requireRole("super_admin"), controller.getAdminSummary);

module.exports = router;