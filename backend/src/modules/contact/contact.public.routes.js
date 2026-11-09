const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("./contact.controller");

const router = express.Router();

// 5 messages per hour per visitor is plenty for a real person.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many messages sent. Please try again later or email us directly."
  }
});

router.post("/", contactLimiter, controller.submitContactMessage);

module.exports = router;