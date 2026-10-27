const express = require("express");
const rateLimit = require("express-rate-limit");
const c = require("./gym.public.controller");

const router = express.Router();

router.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." }
}));

router.get("/card/:token/image", c.cardImage);
router.get("/card/:token", c.cardPage);
router.get("/:venueId/plans", c.plans);
router.get("/:venueId/store", c.storeData);
router.get("/invoice/:token/pdf", c.invoice);
router.post("/:venueId/trial", c.trial);
router.get("/workout/:token/pdf", c.workoutPdf);
router.get("/renew/:token", c.renewPage);
router.post("/renew/:token", c.renewStart);
router.get("/pay/:token", c.payPage);
router.post("/pay/:token/claimed", c.payClaimed);

module.exports = router;