const express = require("express");
const router = express.Router({ mergeParams: true });
const ctrl = require("./booking.controller");
const { protect } = require("../../middleware/auth.middleware");

router.use(protect);
router.get("/",                          ctrl.getBookings);
router.post("/",                         ctrl.createManualBooking);
router.get("/availability",              ctrl.checkAvailability);
router.get("/:bookingId",                ctrl.getBooking);
router.patch("/:bookingId",              ctrl.updateBooking);
router.patch("/:bookingId/status",       ctrl.updateStatus);
router.delete("/:bookingId",             ctrl.deleteBooking);

module.exports = router;