const express = require("express");
const router = express.Router({ mergeParams: true });
const ctrl = require("./slot.controller");
const { authenticate } = require("../../middleware/auth.middleware");

// PUBLIC - active slots only, used by the vendor's public website
// (e.g. the "Select Slot" dropdown in the enquiry form).
// Must stay ABOVE router.use(authenticate) or public visitors get a 401.
router.get("/public", ctrl.getPublicSlots);

// Everything below requires a logged-in owner / team member (dashboard)
router.use(authenticate);
router.get("/",                    ctrl.getSlots);
router.post("/",                   ctrl.createSlot);
router.patch("/:slotId",           ctrl.updateSlot);
router.patch("/:slotId/toggle",    ctrl.toggleSlot);
router.delete("/:slotId",          ctrl.deleteSlot);

module.exports = router;