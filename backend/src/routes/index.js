const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const publicAuthRoutes = require("../modules/publicAuth/publicAuth.routes");
const venueRoutes = require("../modules/venues/venue.routes");
const planRoutes = require("../modules/plans/plan.routes");
const subscriptionRoutes = require("../modules/subscriptions/subscription.routes");
const paymentRoutes = require("../modules/payments/payment.routes");
const slotRoutes = require("../modules/slots/slot.routes");
const inquiryRoutes = require("../modules/inquiries/inquiry.routes");
const bookingRoutes = require("../modules/bookings/booking.routes");
const clientRoutes = require("../modules/clients/client.routes");
const billingRoutes = require("../modules/billing/billing.routes");
const publicInvoiceVerifyRoutes = require("../modules/billing/verify.routes");
const whatsappRoutes = require("../modules/whatsapp/whatsapp.routes");
const analyticsRoutes = require("../modules/analytics/analytics.routes");
const dashboardRoutes = require("../modules/dashboard/dashboard.routes");
const teamMemberRoutes = require("../modules/team-members/teamMember.routes");

const metaRoutes = require("../modules/meta/meta.routes");
const marketplaceProfileRoutes = require("../modules/marketplace-profile/marketplaceProfile.routes");

const discoveryRoutes = require("../modules/discovery/discovery.routes");
const otpRoutes = require("../modules/otp/otp.routes");

const listingRoutes = require("../modules/listing/listing.routes");
const reviewRoutes = require("../modules/reviews/review.routes");

const adminDiscoveryRoutes = require("../modules/admin-discovery/adminDiscovery.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/public-auth", publicAuthRoutes);
router.use("/venues", venueRoutes);
router.use("/plans", planRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/payments", paymentRoutes); 

// Nested-by-venue resources (mergeParams routers)
router.use("/venues/:venueId/slots", slotRoutes);
router.use("/venues/:venueId/inquiries", inquiryRoutes);
router.use("/venues/:venueId/bookings", bookingRoutes);
router.use("/venues/:venueId/clients", clientRoutes);
router.use("/venues/:venueId/billing", billingRoutes);
router.use("/venues/:venueId/team-members", teamMemberRoutes);

// Public, unauthenticated  - invoice authenticity verification (scanned via QR on PDF)
router.use("/public/invoices", publicInvoiceVerifyRoutes);

router.use("/whatsapp", whatsappRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/dashboard", dashboardRoutes);

router.use("/meta", metaRoutes);
router.use("/venues/:venueId/marketplace-profile", marketplaceProfileRoutes);

router.use("/discovery", discoveryRoutes);
router.use("/otp", otpRoutes);

router.use("/listing", listingRoutes);
router.use("/reviews", reviewRoutes);

router.use("/admin/discovery", adminDiscoveryRoutes);

module.exports = router;