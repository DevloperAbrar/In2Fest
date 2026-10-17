// Public (no login) endpoints used by the restaurant's own website: live menu, price preview,
// placing an order and tracking it. Prices are always recomputed on the server.
const express = require("express");
const rateLimit = require("express-rate-limit");
const { Venue } = require("../../database/models");
const { FoodOrder, FoodTable } = require("./food.models");
const { AppError } = require("../../middleware/error.middleware");
const { venueHasFeatureFlag } = require("../../utils/planAccess");
const { schemaReady } = require("../../database/startupMigrations");
const C = require("./food.constants");
const core = require("./food.core");
const menu = require("./food.menu.service");
const orders = require("./food.orders.service");

const limiter = (max) => rateLimit({
  windowMs: 15 * 60 * 1000, max, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." }
});
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

async function foodVenue(id) {
  const venue = core.UUID_RE.test(String(id)) ? await Venue.findOne({ where: { id, is_active: true } }) : null;
  if (!venue || !C.subtypeFor(venue) || !(await venueHasFeatureFlag(venue.id, "food"))) throw new AppError("Restaurant not found", 404);
  return { venue, settings: await core.getSettings(venue.id) };
}

function publicOrder(o, venue, settings) {
  const lines = o.items || [];
  const canPay = o.payment_status === "unpaid" && o.payment_mode !== "room";
  return {
    tracking_token: o.tracking_token, order_no: o.order_no, token_no: o.token_no, status: o.status,
    payment_status: o.payment_status, order_type: o.order_type, table_name: o.table_name,
    items: lines.filter((l) => l.kind !== "charge").map((l) => ({ name: l.description, quantity: l.quantity, amount: Number(l.amount) })),
    charges: lines.filter((l) => l.kind === "charge").map((l) => ({ name: l.description, amount: Number(l.amount) })),
    subtotal: Number(o.subtotal), discount_amount: Number(o.discount_amount), tax: Number(o.cgst) + Number(o.sgst),
    round_off: Number(o.round_off), total: Number(o.total),
    created_at: o.createdAt, claimed: Boolean(o.meta && o.meta.claimed_at),
    upi_link: canPay ? core.upiLink(venue, o) : null,
    eta_min: settings.prep_time_min,
    restaurant: { name: venue.hall_name, phone: venue.phone || "", whatsapp: core.publicConfig(venue, settings).whatsapp }
  };
}

const getMenu = wrap(async (req, res) => {
  const { venue, settings } = await foodVenue(req.params.venueId);
  const data = await menu.publicMenu(venue.id);
  let table = null;
  if (req.query.table) {
    const t = await FoodTable.findOne({ where: { venue_id: venue.id, name: String(req.query.table).slice(0, 30) } });
    table = t ? t.name : null;
  }
  res.json({ success: true, data: { ...data, table, config: core.publicConfig(venue, settings) } });
});

const preview = wrap(async (req, res) => {
  const ctx = await foodVenue(req.params.venueId);
  res.json({ success: true, data: await orders.preview(ctx, req.body, "public") });
});

const placeOrder = wrap(async (req, res) => {
  if (req.body && req.body.website) return res.status(201).json({ success: true, data: null }); // honeypot
  const ctx = await foodVenue(req.params.venueId);
  const order = await orders.place(ctx, req.body, "public");
  res.status(201).json({ success: true, data: publicOrder(order, ctx.venue, ctx.settings) });
});

const track = wrap(async (req, res) => {
  const order = await FoodOrder.findOne({ where: { tracking_token: String(req.params.token || "").slice(0, 40) } });
  if (!order) throw new AppError("Order not found", 404);
  const venue = await Venue.findByPk(order.venue_id);
  res.json({ success: true, data: publicOrder(order, venue, await core.getSettings(venue.id)) });
});

const claim = wrap(async (req, res) => {
  res.json({ success: true, data: await orders.claimPaid(req.params.token) });
});

const router = express.Router();
router.use(schemaReady);
router.get("/order/:token", limiter(300), track);
router.post("/order/:token/claimed", limiter(30), claim);
router.get("/:venueId/menu", limiter(150), getMenu);
router.post("/:venueId/preview", limiter(150), preview);
router.post("/:venueId/orders", limiter(15), placeOrder);

module.exports = router;