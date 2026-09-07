const express = require("express");
const { verifyInvoice } = require("./verify.controller");

const router = express.Router();

router.get("/:invoiceId/verify", verifyInvoice);

module.exports = router;