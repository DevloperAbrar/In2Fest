const express = require("express");
const controller = require("./plan.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

// Public  - shown on marketing site + venue owner plan selection (no auth required to view)
router.get("/", controller.getAllPlans);
router.get("/:id", controller.getPlan);

// Super Admin only
router.post("/", authenticate, requireRole("super_admin"), controller.createPlan);
router.patch("/:id", authenticate, requireRole("super_admin"), controller.updatePlan);
router.delete("/:id", authenticate, requireRole("super_admin"), controller.deletePlan);

module.exports = router;