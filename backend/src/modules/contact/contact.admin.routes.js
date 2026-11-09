const express = require("express");
const controller = require("./contact.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();
router.use(authenticate, requireRole("super_admin"));

router.get("/", controller.listContactMessages);
router.put("/:id", controller.updateContactMessage);
router.delete("/:id", controller.deleteContactMessage);

module.exports = router;