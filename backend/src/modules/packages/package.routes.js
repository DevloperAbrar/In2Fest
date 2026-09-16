const express = require("express");
const router = express.Router({ mergeParams: true });
const ctrl = require("./package.controller");
const { protect } = require("../../middleware/auth.middleware");

router.use(protect);
router.get("/",                        ctrl.getPackages);
router.post("/",                       ctrl.createPackage);
router.patch("/:packageId",            ctrl.updatePackage);
router.patch("/:packageId/toggle",     ctrl.togglePackage);
router.delete("/:packageId",           ctrl.deletePackage);

module.exports = router;