const express = require("express");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const svc = require("./demo.service");

const router = express.Router();

// Super admin only.
router.use(authenticate, requireRole("super_admin"));

const h = (fn, status = 200) => async (req, res, next) => {
  try {
    res.status(status).json({ success: true, data: await fn(req) });
  } catch (e) {
    next(e);
  }
};

router.get("/", h(() => svc.listDemos()));
router.post("/", h((req) => svc.createDemo(req.body, req.user), 201));
router.post("/:id/reset", h((req) => svc.resetDemo(req.params.id)));
router.post("/:id/extend", h((req) => svc.extendDemo(req.params.id, req.body && req.body.days)));
router.post("/:id/revoke", h((req) => svc.revokeDemo(req.params.id)));
router.post("/:id/password", h((req) => svc.regeneratePassword(req.params.id, req.body && req.body.password)));
router.delete("/:id", h((req) => svc.deleteDemo(req.params.id)));

module.exports = router;