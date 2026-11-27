// Two routers:
//   vendorRouter  -> /api/venues/:venueId/addons   (the owner sees, buys and renews add-ons)
//   adminRouter   -> /api/admin/addons             (Super Admin: prices, assign, revoke, who has what)
const express = require("express");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { schemaReady } = require("../../database/startupMigrations");
const svc = require("./addon.service");
const pay = require("./addon.payment");

const send = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};

/* ---------- vendor ---------- */
const vendorRouter = express.Router({ mergeParams: true });
vendorRouter.use(schemaReady, authenticate, requireVenueOwnership, requireRole("venue_owner"));

vendorRouter.get("/", send((req) => svc.listForVenue(req.params.venueId)));
vendorRouter.get("/:key/quote", send((req) => pay.getQuote(req.params.venueId, req.params.key, req.query.billingCycle)));
vendorRouter.post("/:key/order", send((req) => pay.createOrder(req.params.venueId, req.user.id, req.params.key, req.body), 201));
vendorRouter.post("/:key/verify", send((req) => pay.verify(req.params.venueId, req.params.key, req.body)));

/* ---------- super admin ---------- */
const adminRouter = express.Router();
adminRouter.use(schemaReady, authenticate, requireRole("super_admin"));

adminRouter.get("/", send(() => svc.listCatalog()));
adminRouter.put("/:key/pricing", send((req) => svc.updatePricing(req.params.key, req.body, req.user.id)));
adminRouter.get("/:key/holders", send((req) => svc.listHolders(req.params.key, req.query)));
adminRouter.post("/grant", send((req) => svc.adminGrant(req.user, req.body), 201));
adminRouter.post("/revoke", send((req) => svc.adminRevoke(req.user, req.body)));
adminRouter.get("/venue/:venueId", send((req) => svc.venueEntitlements(req.params.venueId)));

module.exports = { vendorRouter, adminRouter };