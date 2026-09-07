const express = require("express");
const controller = require("./adminDiscovery.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();
router.use(authenticate, requireRole("super_admin"));

router.get("/featured-vendors", controller.getFeaturedVendors);
router.put("/featured-vendors", controller.setFeaturedVendors);
router.put("/venues/:venueId/badges", controller.setVenueBadges);

router.get("/cities", controller.listCities);
router.post("/cities", controller.createCity);
router.put("/cities/:cityId", controller.updateCity);

// Category CRUD  - admin-only, DB-driven
router.get("/categories", controller.listAllCategories);
router.post("/categories", controller.createCategory);
router.put("/categories/:categoryId", controller.updateCategory);
router.delete("/categories/:categoryId", controller.deleteCategory);

router.get("/analytics", controller.getAnalytics);

module.exports = router;