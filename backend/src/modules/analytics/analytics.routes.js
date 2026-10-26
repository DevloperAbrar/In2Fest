const express = require("express");
const controller = require("./analytics.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");

const router = express.Router();

// ---------- Super Admin ----------
router.get("/admin/dashboard", authenticate, requireRole("super_admin"), controller.getAdminDashboardStats);
router.get("/admin/mrr-trend", authenticate, requireRole("super_admin"), controller.getMrrTrend);
router.get("/admin/churn", authenticate, requireRole("super_admin"), controller.getChurnRate);
router.get("/admin/distribution", authenticate, requireRole("super_admin"), controller.getDistribution);
router.get("/admin/trial-conversion", authenticate, requireRole("super_admin"), controller.getTrialConversion);
router.get("/admin/signup-trend", authenticate, requireRole("super_admin"), controller.getSignupTrend);
router.get("/admin/revenue-by-plan", authenticate, requireRole("super_admin"), controller.getRevenueByPlan);
router.get("/admin/payment-methods", authenticate, requireRole("super_admin"), controller.getPaymentMethodBreakdown);
router.get("/admin/subscription-status", authenticate, requireRole("super_admin"), controller.getSubscriptionStatusBreakdown);
router.get("/admin/top-venues", authenticate, requireRole("super_admin"), controller.getTopVenues);
router.get("/admin/gst-adoption", authenticate, requireRole("super_admin"), controller.getGstAdoption);
router.get("/admin/whatsapp-stats", authenticate, requireRole("super_admin"), controller.getWhatsappStats);

// ---------- Venue Owner (only for the owner's own venue) ----------
router.get("/owner/:venueId", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getOwnerAnalytics);
router.get("/owner/:venueId/slot-popularity", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getSlotPopularity);
router.get("/owner/:venueId/inquiry-funnel", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getInquiryFunnel);
router.get("/owner/:venueId/booking-status", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getBookingStatusBreakdown);
router.get("/owner/:venueId/revenue-by-event-type", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getRevenueByEventType);
router.get("/owner/:venueId/inquiry-source", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getInquirySourceBreakdown);
router.get("/owner/:venueId/payment-collection", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getPaymentCollectionTrend);
router.get("/owner/:venueId/review-stats", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getReviewStats);
router.get("/owner/:venueId/top-clients", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getTopClients);
router.get("/owner/:venueId/bookings-by-weekday", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getBookingsByWeekday);
router.get("/owner/:venueId/whatsapp-stats", authenticate, requireRole("venue_owner"), requireVenueOwnership, controller.getWhatsappStats);

module.exports = router;