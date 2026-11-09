const express = require("express");
const { checkinRouter, kioskRouter } = require("./library.attendance.public");

const router = express.Router();
router.use("/checkin", checkinRouter);
router.use("/kiosk", kioskRouter);

module.exports = router;