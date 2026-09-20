const express = require("express");
const controller = require("./announcement.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { upload } = require("../../middleware/upload.middleware");

const router = express.Router();

// Public - used by discovery frontend
router.get("/public", controller.getActive);

// Admin-only routes
router.use(authenticate, requireRole("super_admin"));
router.get("/", controller.getAll);
router.post("/", upload.single("image"), controller.create);
router.put("/:id", upload.single("image"), controller.update);
router.delete("/:id", controller.remove);

module.exports = router;