const express = require("express");
const controller = require("./otp.controller");
const { authLimiter } = require("../../middleware/rateLimiter.middleware");

const router = express.Router();

// Rate-limit OTP routes: same 10-req/15min window as login.
// Without this, anyone can hammer any phone number indefinitely.
router.post("/request", authLimiter, controller.requestOtp);
router.post("/verify", authLimiter, controller.verifyOtpHandler);

module.exports = router;