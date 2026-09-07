const express = require("express");
const searchController = require("./search.controller");
const homepageController = require("./homepage.controller");
const cityController = require("./city.controller");
const vendorPublicController = require("./vendorPublic.controller");

const router = express.Router();

router.get("/homepage", homepageController.getHomepage);
router.get("/search", searchController.searchVendors);
router.get("/autocomplete", searchController.autocomplete);

router.get("/states", cityController.getStates);
router.get("/state/:stateSlug", cityController.getState);

router.get("/city/:citySlug", cityController.getCityHome);
router.get("/city/:citySlug/category/:categorySlug", cityController.getCityCategory);
router.get("/city/:citySlug/category/:categorySlug/locality/:localitySlug", cityController.getCityCategoryLocality);

router.get("/resolve/:citySlug/:categorySlug/:slug", vendorPublicController.resolveThirdSegment);
router.get("/vendor/:citySlug/:categorySlug/:vendorSlug", vendorPublicController.getVendorProfile);

module.exports = router;