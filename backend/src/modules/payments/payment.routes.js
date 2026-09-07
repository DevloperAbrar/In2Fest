const express = require("express");
const controller = require("./payment.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.post("/create-order", authenticate, requireRole("venue_owner"), controller.createOrder);
router.post("/verify", authenticate, requireRole("venue_owner"), controller.verifyPayment);

router.post("/manual", authenticate, requireRole("super_admin"), controller.recordManualPayment);
router.get("/", authenticate, requireRole("super_admin"), controller.listPayments);

module.exports = router;