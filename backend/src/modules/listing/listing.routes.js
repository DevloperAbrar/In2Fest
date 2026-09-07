const express = require("express");
const controller = require("./listing.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { publicInquiryLimiter } = require("../../middleware/rateLimiter.middleware");

const router = express.Router();

// Public
router.post("/register", publicInquiryLimiter, controller.registerFreeListing);
router.get("/:id", controller.getPublicListing);

// Super Admin
router.get("/admin/all", authenticate, requireRole("super_admin"), controller.adminListAll);
router.put("/admin/:id/approve", authenticate, requireRole("super_admin"), controller.adminApprove);
router.put("/admin/:id/reject", authenticate, requireRole("super_admin"), controller.adminReject);
router.post("/admin/:id/send-upgrade-link", authenticate, requireRole("super_admin"), controller.sendUpgradeLink);

module.exports = router;