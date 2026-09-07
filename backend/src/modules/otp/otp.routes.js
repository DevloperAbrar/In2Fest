const express = require("express");
const controller = require("./otp.controller");

const router = express.Router();

router.post("/request", controller.requestOtp);
router.post("/verify", controller.verifyOtpHandler);

module.exports = router;