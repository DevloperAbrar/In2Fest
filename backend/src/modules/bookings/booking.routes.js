const express = require("express");
const controller = require("./booking.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const ledgerController = require("../clients/paymentLedger.controller");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");

const router = express.Router({ mergeParams: true });

// Public  - availability check for the public calendar
router.get("/availability", controller.checkAvailability);

// Venue Owner
router.use(
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("bookings"),
  requireTeamPermission("bookings")
);

router.post("/", controller.createManualBooking);
router.post("/from-inquiry/:inquiryId", controller.convertInquiryToBooking);
router.get("/", controller.getBookings);
router.get("/:bookingId", controller.getBooking);
router.patch("/:bookingId/status", controller.updateStatus);
router.patch("/:bookingId", controller.updateBooking);

router.post("/:bookingId/payments", ledgerController.addLedgerEntry);
router.get("/:bookingId/payments", ledgerController.getLedgerForBooking);

router.delete("/:bookingId", controller.deleteBooking);

module.exports = router;