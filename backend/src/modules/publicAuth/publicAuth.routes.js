const express = require("express");
const controller = require("./publicAuth.controller");
const { authenticatePublicUser } = require("../../middleware/publicAuth.middleware");
const { authLimiter } = require("../../middleware/rateLimiter.middleware");

const router = express.Router();

router.post("/google", authLimiter, controller.googleLogin);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.get("/me", authenticatePublicUser, controller.me);

module.exports = router;