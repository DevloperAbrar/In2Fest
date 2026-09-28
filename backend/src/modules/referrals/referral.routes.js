const express = require("express");
const controller = require("./referral.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.get("/me", authenticate, requireRole("venue_owner"), controller.getMyReferrals);
router.get("/quote", authenticate, requireRole("venue_owner"), controller.getQuote);

module.exports = router;