const express = require("express");
const controller = require("./whatsapp.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");

const router = express.Router();

router.use(authenticate, requireRole("super_admin"));

router.post("/send", controller.sendDirectMessage);
router.post("/send-bulk", controller.sendBulkMessage);
router.get("/history", controller.getMessageHistory);

router.post("/templates", controller.createTemplate);
router.get("/templates", controller.getTemplates);
router.patch("/templates/:id", controller.updateTemplate);

module.exports = router;