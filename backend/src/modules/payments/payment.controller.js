const crypto = require("crypto");
const { getRazorpayInstance } = require("../../config/razorpay");
const { Payment, Subscription, Plan } = require("../../database/models");
const subscriptionService = require("../subscriptions/subscription.service");
const { AppError } = require("../../middleware/error.middleware");
const env = require("../../config/env");

/**
 * Creates a Razorpay order for a venue's subscription payment.
 * Used for BOTH first-time onboarding payment and plan-switch payment —
 * the amount always comes from the Plan table server-side, never from the client.
 */
async function createOrder(req, res, next) {
  try {
    const { venueId, planId } = req.body;
    const razorpay = getRazorpayInstance();
    if (!razorpay) throw new AppError("Payment gateway not configured", 503);

    const plan = await Plan.findByPk(planId);
    if (!plan) throw new AppError("Plan not found", 404);
    if (!plan.is_active) throw new AppError("This plan is no longer available", 400);

    const order = await razorpay.orders.create({
      amount: Math.round(Number(plan.monthly_price) * 100), // paise
      currency: "INR",
      receipt: `venue_${venueId}_${Date.now()}`,
      notes: { venueId, planId }
    });

    res.json({ success: true, data: { order, keyId: env.razorpay.keyId } });
  } catch (error) {
    next(error);
  }
}

/**
 * Verifies Razorpay signature after checkout success on the frontend,
 * then either:
 *  - activates a brand-new subscription (first-time onboarding payment), or
 *  - renews the CURRENT plan (same planId as existing subscription), or
 *  - switches to a DIFFERENT plan (plan-change payment from Settings page).
 */
async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, venueId, planId } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", env.razorpay.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Use constant-time comparison — same reason as the webhook handler.
    const sigBuffer = Buffer.from(razorpay_signature || "", "utf8");
    const expBuffer = Buffer.from(expectedSignature, "utf8");
    const isValid =
      sigBuffer.length === expBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expBuffer);

    if (!isValid) {
      throw new AppError("Payment verification failed — invalid signature", 400);
    }

    const plan = await Plan.findByPk(planId);
    if (!plan) throw new AppError("Plan not found", 404);

    const existingSub = await Subscription.findOne({ where: { venue_id: venueId } });
    let subscription;

    if (existingSub) {
      subscription =
        existingSub.plan_id === planId
          ? await subscriptionService.renewSubscription(venueId)
          : await subscriptionService.switchPlanAfterPayment(venueId, planId);
    } else {
      subscription = await subscriptionService.createSubscription(venueId, planId);
      subscription.status = "active";
      await subscription.save();
    }

    await Payment.create({
      venue_id: venueId,
      amount: plan.monthly_price,
      method: "razorpay",
      status: "success",
      plan_name_snapshot: plan.name,
      period_covered_start: subscription.current_period_start,
      period_covered_end: subscription.current_period_end,
      razorpay_payment_id,
      razorpay_order_id
    });

    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}

/**
 * Razorpay webhook  - handles async events (e.g. payment.captured) as a backup
 * to the client-side verification flow above.
 */
async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers["x-razorpay-signature"];

    if (!signature || !env.razorpay.webhookSecret) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", env.razorpay.webhookSecret)
      .update(req.body) // raw Buffer from express.raw()
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    // Constant-time comparison — a plain `!==` string compare leaks timing
    // information that could theoretically help brute-force the signature.
    const isValid =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const payload = JSON.parse(req.body.toString("utf8"));
    const event = payload.event;
    if (process.env.NODE_ENV !== "production") {
  console.log(`[RAZORPAY WEBHOOK] Event received: ${event}`);
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