const express = require("express");
const controller = require("./meta.controller");

const router = express.Router();

// All public, no auth  - used by dashboard dropdowns and later the discovery frontend
router.get("/cities", controller.listCities);
router.get("/categories", controller.listCategories);
router.get("/categories/:categorySlug/services-checklist", controller.getServicesChecklist);
router.get("/categories/:categorySlug/section-defaults", controller.getSectionDefaults);
router.get("/section-types", controller.listSectionTypes);
router.get("/pincode/:pincode", controller.lookupPincode);
router.get("/states", controller.listStates);
router.get("/states/:stateCode/cities", controller.listCitiesForState);

module.exports = router;