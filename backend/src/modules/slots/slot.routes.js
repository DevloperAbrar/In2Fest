const express = require("express");
const router = express.Router({ mergeParams: true });
const ctrl = require("./slot.controller");
const { authenticate } = require("../../middleware/auth.middleware");

router.use(authenticate);
router.get("/",                    ctrl.getSlots);
router.post("/",                   ctrl.createSlot);
router.patch("/:slotId",           ctrl.updateSlot);
router.patch("/:slotId/toggle",    ctrl.toggleSlot);   // NEW
router.delete("/:slotId",          ctrl.deleteSlot);

module.exports = router;