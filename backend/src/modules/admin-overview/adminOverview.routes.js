const express = require("express");
const controller = require("./adminOverview.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

// Everything here is Super Admin only.
router.use(authenticate, requireRole("super_admin"));

router.get("/summary", controller.getSummary);
router.get("/registrations", controller.getRegistrations);
router.get("/logins", controller.getLogins);
router.get("/plans", controller.getPlans);
router.get("/marketplace", controller.getMarketplace);
router.get("/system", controller.getSystem);

module.exports = router;