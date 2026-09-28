const crypto = require("crypto");
const { getCashfreeClient } = require("../../config/cashfree");
const { Payment, Subscription, Plan, Venue, User } = require("../../database/models");
const subscriptionService = require("../subscriptions/subscription.service");
const { AppError } = require("../../middleware/error.middleware");
const env = require("../../config/env");
const { getAmountForCycle, normalizeCycle } = require("../plans/planPricing");

/**
 * Creates a Cashfree order for a venue's subscription payment.
 * Used for BOTH first-time onboarding payment and plan-switch payment —
 * the amount always comes from the Plan table server-side, never from the client.
 */
async function createOrder(req, res, next) {
  try {
    const { venueId, planId, returnPath, billingCycle } = req.body;
    const cycle = normalizeCycle(billingCycle);
    const cashfree = getCashfreeClient();
    if (!cashfree) throw new AppError("Payment gateway not configured", 503);

    const plan = await Plan.findByPk(planId);
    if (!plan) throw new AppError("Plan not found", 404);
    if (!plan.is_active) throw new AppError("This plan is no longer available", 400);

    // Price always computed server-side (yearly/monthly + active offer discount)
    const amount = getAmountForCycle(plan, cycle);
    if (!(amount >= 1)) throw new AppError("This plan does not require payment", 400);

    const venue = await Venue.findByPk(venueId, {
      include: [{ model: User, as: "owner" }]
    });
    if (!venue) throw new AppError("Venue not found", 404);

    const digitsOnly = (venue.phone || "").replace(/\D/g, "");
    const customerPhone = digitsOnly.slice(-10).padStart(10, "9");

    const orderId = `order_${venueId}_${Date.now()}`;
    const safeReturnPath = returnPath || "/dashboard";

    let cfOrder;
    try {
      const { data } = await cashfree.post("/orders", {
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: venueId,
          customer_name: venue.owner_name || "Vendor",
          customer_email: venue.owner?.email || "vendor@in2fest.com",
          customer_phone: customerPhone
        },
        order_meta: {
          return_url: `${env.clientUrl}${safeReturnPath}?cf_order_id={order_id}`
        },
        // Read back in verifyPayment so the cycle can't be tampered with client-side
        order_tags: { billing_cycle: cycle },
        order_note: `${plan.name} plan (${cycle}) subscription for venue ${venueId}`
      });
      cfOrder = data;
    } catch (cashfreeError) {
      const description =
        cashfreeError?.response?.data?.message ||
        cashfreeError?.message ||
        "Could not create the payment order";
      console.error("[CASHFREE] Order creation failed:", cashfreeError?.response?.data || cashfreeError);
      throw new AppError(`Payment gateway error: ${description}`, 502);
    }

    res.json({
      success: true,
      data: {
        orderId: cfOrder.order_id,
        paymentSessionId: cfOrder.payment_session_id,
        mode: env.cashfree.env
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirms payment AFTER the Cashfree Drop-in checkout closes, then either:
 *  - activates a brand-new subscription (first-time onboarding payment), or
 *  - renews the CURRENT plan (same planId as existing subscription), or
 *  - switches to a DIFFERENT plan (plan-change payment from Settings page).
 *
 * Cashfree's recommended flow is to ask Cashfree directly for the order's
 * current status server-side, rather than trusting anything the client
 * sends back — the client has no way to fake "order_status: PAID" here.
 */
async function verifyPayment(req, res, next) {
  try {
    const { orderId, venueId, planId } = req.body;
    if (!orderId) throw new AppError("orderId is required", 400);
    if (!venueId || !orderId.startsWith(`order_${venueId}_`)) {
      throw new AppError("This order does not belong to this venue", 400);
    }

    const cashfree = getCashfreeClient();
    if (!cashfree) throw new AppError("Payment gateway not configured", 503);

    let cfOrder;
    try {
      const { data } = await cashfree.get(`/orders/${orderId}`);
      cfOrder = data;
    } catch (cashfreeError) {
      const description =
        cashfreeError?.response?.data?.message ||
        cashfreeError?.message ||
        "Could not verify the payment";
      console.error("[CASHFREE] Order status check failed:", cashfreeError?.response?.data || cashfreeError);
      throw new AppError(`Payment gateway error: ${description}`, 502);
    }

    if (cfOrder.order_status !== "PAID") {
      throw new AppError(`Payment not completed (status: ${cfOrder.order_status})`, 402);
    }

    const plan = await Plan.findByPk(planId);
    if (!plan) throw new AppError("Plan not found", 404);

    const cycle = normalizeCycle(cfOrder.order_tags?.billing_cycle);
    // What the vendor was actually charged (offer discount already included)
    const paidAmount = Number(cfOrder.order_amount);

    const existingSub = await Subscription.findOne({ where: { venue_id: venueId } });
    let subscription;

    if (existingSub) {
      subscription =
        existingSub.plan_id === planId
          ? await subscriptionService.renewSubscription(venueId, { billingCycle: cycle, amount: paidAmount })
          : await subscriptionService.switchPlanAfterPayment(venueId, planId, { billingCycle: cycle, amount: paidAmount });
    } else {
      // Already paid, so no trial period
      subscription = await subscriptionService.createSubscription(venueId, planId, {
        billingCycle: cycle,
        skipTrial: true
      });
      subscription.locked_price = paidAmount;
      subscription.status = "active";
      await subscription.save();
    }

    let cfPaymentId = null;
    try {
      const { data: attempts } = await cashfree.get(`/orders/${orderId}/payments`);
      if (Array.isArray(attempts) && attempts.length > 0) {
        cfPaymentId = attempts[attempts.length - 1].cf_payment_id || null;
      }
    } catch (lookupError) {
      console.warn("[CASHFREE] Could not fetch payment id for order", orderId, lookupError?.message);
    }

    await Payment.create({
      venue_id: venueId,
      amount: paidAmount,
      method: "cashfree",
      status: "success",
      plan_name_snapshot: plan.name,
      period_covered_start: subscription.current_period_start,
      period_covered_end: subscription.current_period_end,
      cf_payment_id: cfPaymentId,
      cf_order_id: orderId,
      notes: `Billing: ${cycle}`
    });

    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}

/**
 * Cashfree webhook — handles async events (e.g. PAYMENT_SUCCESS_WEBHOOK) as a
 * backup to the client-triggered verifyPayment call above, in case the
 * vendor closes the tab right after paying and verifyPayment never fires.
 */
async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];

    if (!signature || !timestamp || !env.cashfree.secretKey) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    // Cashfree signs "timestamp + rawBody" with HMAC-SHA256 using your
    // Client Secret, base64-encoded — req.body here is the raw Buffer from
    // express.raw() (see cashfree.webhook.js), which must stay untouched
    // (no JSON parsing) for the signature to match.
    const expectedSignature = crypto
      .createHmac("sha256", env.cashfree.secretKey)
      .update(timestamp + req.body.toString("utf8"))
      .digest("base64");

    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    const isValid =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const payload = JSON.parse(req.body.toString("utf8"));
    const event = payload.type;
    if (process.env.NODE_ENV !== "production") {
      console.log(`[CASHFREE WEBHOOK] Event received: ${event}`);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * Super Admin manually records an offline UPI/cash payment.
 */
async function recordManualPayment(req, res, next) {
  try {
    const { venueId, amount, method, notes, periodCoveredStart, periodCoveredEnd } = req.body;

    const payment = await Payment.create({
      venue_id: venueId,
      amount,
      method: method || "upi_manual",
      status: "success",
      notes,
      period_covered_start: periodCoveredStart,
      period_covered_end: periodCoveredEnd,
      recorded_by: req.user.id
    });

    await subscriptionService.renewSubscription(venueId);

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
}

async function listPayments(req, res, next) {
  try {
    const { venueId } = req.query;
    const where = venueId ? { venue_id: venueId } : {};
    const payments = await Payment.findAll({ where, order: [["created_at", "DESC"]] });
    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  recordManualPayment,
  listPayments
};