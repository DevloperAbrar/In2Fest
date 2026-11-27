// Buying or renewing an add-on through Cashfree. Plan payments (payments/payment.controller.js) are
// NOT touched: an add-on has its own order, its own verify step and its own expiry date.
// Renewing is simply buying again, so a renewal always uses the CURRENT price set in Admin > Add-ons.
const { getCashfreeClient } = require("../../config/cashfree");
const { sequelize } = require("../../config/database");
const env = require("../../config/env");
const { Payment, User } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { roundRupee } = require("../plans/planPricing");
const svc = require("./addon.service");

const safePath = (p) => (typeof p === "string" && /^\/[A-Za-z0-9/_\-.#?=&]*$/.test(p) && !p.startsWith("//") ? p : "/dashboard/settings/subscription");

// Short on purpose (47 characters): payment gateways limit the order id length.
// The add-on itself is stored in the order tags and checked again on verify.
const orderPrefix = (venueId) => `addon_${String(venueId).replace(/-/g, "")}_`;

function quoteView(quote) {
  return { ...quote, credit_available: 0, credit_used: 0 };
}

async function getQuote(venueId, key, cycle) {
  const { quote, def, cycle: c } = await svc.quoteFor(venueId, key, cycle);
  return { addon: { key: def.key, label: def.label }, billing_cycle: c, quote: quoteView(quote) };
}

async function createOrder(venueId, ownerId, key, body) {
  const cashfree = getCashfreeClient();
  if (!cashfree) throw new AppError("Payment gateway not configured", 503);

  const { venue, def, cycle, quote } = await svc.quoteFor(venueId, key, body && body.billingCycle);
  const owner = await User.findByPk(ownerId, { attributes: ["email"] });

  const digits = String(venue.phone || "").replace(/\D/g, "");
  const customerPhone = digits.slice(-10).padStart(10, "9");
  const orderId = `${orderPrefix(venue.id)}${Date.now().toString(36)}`;

  let cfOrder;
  try {
    const { data } = await cashfree.post("/orders", {
      order_id: orderId,
      order_amount: quote.total_payable,
      order_currency: "INR",
      customer_details: {
        customer_id: venue.id,
        customer_name: venue.owner_name || "Vendor",
        customer_email: (owner && owner.email) || "vendor@in2fest.com",
        customer_phone: customerPhone
      },
      order_meta: { return_url: `${env.clientUrl}${safePath(body && body.returnPath)}?cf_order_id={order_id}` },
      order_tags: { type: "addon", addon_key: def.key, billing_cycle: cycle },
      order_note: `Add-on: ${def.label} (${cycle}) for venue ${venue.id}`
    });
    cfOrder = data;
  } catch (err) {
    console.error("[ADDON] Cashfree order failed:", (err && err.response && err.response.data) || err);
    const msg = (err && err.response && err.response.data && err.response.data.message) || (err && err.message) || "Could not create the payment order";
    throw new AppError(`Payment gateway error: ${msg}`, 502);
  }

  return {
    orderId: cfOrder.order_id,
    paymentSessionId: cfOrder.payment_session_id,
    mode: env.cashfree.env,
    billing_cycle: cycle,
    quote: quoteView(quote)
  };
}

// Called after the Cashfree window closes. Safe to call twice for the same order: the second call changes nothing.
async function verify(venueId, key, body) {
  const def = svc.needDef(key);
  const orderId = String((body && body.orderId) || "");
  if (!orderId) throw new AppError("orderId required", 400);
  // The order must belong to THIS vendor (an order id of another vendor cannot be used).
  if (!orderId.startsWith(orderPrefix(venueId))) throw new AppError("This payment does not belong to this add-on", 400);

  const cashfree = getCashfreeClient();
  if (!cashfree) throw new AppError("Payment gateway not configured", 503);

  let cfOrder;
  try {
    const { data } = await cashfree.get(`/orders/${orderId}`);
    cfOrder = data;
  } catch (e) {
    throw new AppError("Could not verify payment with gateway", 502);
  }
  if (cfOrder.order_status !== "PAID") throw new AppError("Payment not completed", 402);

  // ... and for THIS add-on.
  const tags = cfOrder.order_tags || {};
  if (tags.type !== "addon" || tags.addon_key !== def.key) throw new AppError("This payment does not belong to this add-on", 400);

  const paid = roundRupee(cfOrder.order_amount);
  if (!(paid > 0)) throw new AppError("Invalid payment amount", 400);
  const cycle = tags.billing_cycle === "yearly" ? "yearly" : "monthly";
  const success = (cfOrder.order_payments || []).find((p) => p.payment_status === "SUCCESS");
  const cfPaymentId = (success && success.cf_payment_id) || cfOrder.cf_order_id || orderId;

  const venue = await svc.loadVenue(venueId);
  const rate = env.gstRate;
  // Whatever was paid already includes GST (added on top, or inside the sticker price).
  const taxable = roundRupee(paid / (1 + rate / 100));

  const t = await sequelize.transaction();
  try {
    // Two verify calls for the same order wait here, so the add-on can never be extended twice.
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:k))", { replacements: { k: `addon-order:${orderId}` }, transaction: t });
    const done = await Payment.findOne({ where: { cf_order_id: orderId, venue_id: venue.id }, transaction: t });
    if (done) {
      await t.rollback();
      return { already_processed: true };
    }

    const paymentRow = await Payment.create({
      venue_id: venue.id, amount: paid, method: "cashfree", status: "success",
      plan_name_snapshot: `Add-on: ${def.label}`,
      cf_payment_id: cfPaymentId, cf_order_id: orderId,
      base_amount: taxable, discount_amount: 0, credit_used: 0,
      gst_rate: rate, gst_amount: roundRupee(paid - taxable), total_amount: paid,
      notes: `Add-on ${def.label} (${cycle})`
    }, { transaction: t });

    const row = await svc.applyEntitlement(t, {
      venueId: venue.id, key: def.key, source: "paid", cycle, lockedPrice: taxable, paymentId: paymentRow.id, note: null
    });
    await paymentRow.update({ period_covered_start: row.starts_at, period_covered_end: row.ends_at }, { transaction: t });
    await t.commit();
    return { entitlement: svc.entitlementView(row) };
  } catch (e) {
    try { await t.rollback(); } catch (_) { /* already finished */ }
    throw e;
  }
}

module.exports = { getQuote, createOrder, verify };