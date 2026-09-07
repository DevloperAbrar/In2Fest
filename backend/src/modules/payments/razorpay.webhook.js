const express = require("express");
const { handleWebhook } = require("./payment.controller");

const router = express.Router();

router.post("/razorpay", express.raw({ type: "application/json" }), handleWebhook);

module.exports = router;