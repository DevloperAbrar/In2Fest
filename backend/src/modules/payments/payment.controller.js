const crypto = require("crypto");
const { getCashfreeClient } = require("../../config/cashfree");
const { Payment, Subscription, Plan, Venue, User } = require("../../database/models");
const { sequelize } = require("../../config/database");
const subscriptionService = require("../subscriptions/subscription.service");
const referralService = require("../referrals/referral.service");
const { AppError } = require("../../middleware/error.middleware");
const env = require("../../config/env");
const { getAmountForCycle, normalizeCycle, computeQuote, roundRupee } = require("../plans/planPricing");

/**
 * Creates a Cashfree order for a venue's subscription payment.
 * Price is always computed server-side. Referral credit + GST applied here.
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

    const venue = await Venue.findByPk(venueId, {
      include: [{ model: User, as: "owner" }]
    });
    if (!venue) throw new AppError("Venue not found", 404);

    // Server-side quote (GST + credit)
    const creditAvail = await referralService.getCreditBalance(venueId);
    const quote = computeQuote(plan, cycle, creditAvail, env.gstRate, env.referral.friendPercent);

    if (quote.is_free) {
      // No Cashfree order needed — activate directly
      return res.json({
        success: true,
        data: {
          orderId: null,
          paymentSessionId: null,
          mode: env.cashfree.env,
          quote,
          creditOnly: true
        }
      });
    }

    if (quote.total_payable < 1) throw new AppError("This plan does not require payment", 400);

    const digitsOnly = (venue.phone || "").replace(/\D/g, "");
    const customerPhone = digitsOnly.slice(-10).padStart(10, "9");

    const orderId = `order_${venueId}_${Date.now()}`;
    const safeReturnPath = returnPath || "/dashboard";

    let cfOrder;
    try {
      const { data } = await cashfree.post("/orders", {
        order_id: orderId,
        order_amount: quote.total_payable,
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
        mode: env.cashfree.env,
        quote,
        creditOnly: false
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirms payment after Cashfree checkout closes, OR activates credit-only order.
 * All amounts are re-computed server-side; never trust client-sent amounts.
 */
async function verifyPayment(req, res, next) {
  try {
    const { orderId, venueId, planId, creditOnly } = req.body;

    if (!venueId || !planId) throw new AppError("venueId and planId required", 400);

    const plan = await Plan.findByPk(planId);
    if (!plan) throw new AppError("Plan not found", 404);

    const t = await sequelize.transaction();
    try {
      let cycle, paidAmount, cfPaymentId = null;

      if (creditOnly) {
        // Full credit cover — no Cashfree involved
        const creditAvail = await referralService.getCreditBalance(venueId);
        const quote = computeQuote(plan, req.body.billingCycle || "monthly", creditAvail, env.gstRate, env.referral.friendPercent);
        if (!quote.is_free) {
          await t.rollback();
          throw new AppError("Credit does not fully cover this order", 400);
        }
        cycle = normalizeCycle(req.body.billingCycle);
        paidAmount = 0;

        // Deduct credit
        const dummyPaymentId = `credit_${venueId}_${Date.now()}`;
        await referralService.spendCredit(t, venueId, quote.credit_used, dummyPaymentId);

        const existingSub = await Subscription.findOne({ where: { venue_id: venueId }, transaction: t });
        let subscription;
        if (existingSub) {
          subscription = existingSub.plan_id === planId
            ? await subscriptionService.renewSubscription(venueId, { billingCycle: cycle, amount: 0 })
            : await subscriptionService.switchPlanAfterPayment(venueId, planId, { billingCycle: cycle, amount: 0 });
        } else {
          subscription = await subscriptionService.createSubscription(venueId, planId, { billingCycle: cycle, skipTrial: true });
          subscription.locked_price = 0;
          subscription.status = "active";
          await subscription.save();
        }

        const paymentRow = await Payment.create({
          venue_id: venueId,
          amount: 0,
          method: "credit",
          status: "success",
          plan_name_snapshot: plan.name,
          period_covered_start: subscription.current_period_start,
          period_covered_end: subscription.current_period_end,
          base_amount: quote.plan_price,
          discount_amount: quote.discount_amount,
          credit_used: quote.credit_used,
          gst_rate: quote.gst_rate,
          gst_amount: 0,
          total_amount: 0,
          notes: `Credit-only payment. Billing: ${cycle}`
        }, { transaction: t });

        await referralService.maybeAssignReferralCode(venueId);
        await t.commit();
        return res.json({ success: true, data: subscription });
      }

      // Normal Cashfree payment
      if (!orderId) throw new AppError("orderId is required", 400);
      if (!orderId.startsWith(`order_${venueId}_`)) {
        await t.rollback();
        throw new AppError("This order does not belong to this venue", 400);
      }

      const cashfree = getCashfreeClient();
      if (!cashfree) { await t.rollback(); throw new AppError("Payment gateway not configured", 503); }

      let cfOrder;
      try {
        const { data } = await cashfree.get(`/orders/${orderId}`);
        cfOrder = data;
      } catch (cashfreeError) {
        await t.rollback();
        const description = cashfreeError?.response?.data?.message || cashfreeError?.message || "Could not verify the payment";
        throw new AppError(`Payment gateway error: ${description}`, 502);
      }

      if (cfOrder.order_status !== "PAID") {
        await t.rollback();
        throw new AppError(`Payment not completed (status: ${cfOrder.order_status})`, 402);
      }

      cycle = normalizeCycle(cfOrder.order_tags?.billing_cycle);
      paidAmount = Number(cfOrder.order_amount);

      // Re-compute server-side quote to get breakdown
      const creditAvail = await referralService.getCreditBalance(venueId);
      const quote = computeQuote(plan, cycle, creditAvail, env.gstRate, env.referral.friendPercent);

      try {
        const { data: attempts } = await cashfree.get(`/orders/${orderId}/payments`);
        if (Array.isArray(attempts) && attempts.length > 0) {
          cfPaymentId = attempts[attempts.length - 1].cf_payment_id || null;
        }
      } catch (_) {}

      const existingSub = await Subscription.findOne({ where: { venue_id: venueId }, transaction: t });
      let subscription;
      if (existingSub) {
        subscription = existingSub.plan_id === planId
          ? await subscriptionService.renewSubscription(venueId, { billingCycle: cycle, amount: quote.taxable_amount })
          : await subscriptionService.switchPlanAfterPayment(venueId, planId, { billingCycle: cycle, amount: quote.taxable_amount });
      } else {
        subscription = await subscriptionService.createSubscription(venueId, planId, { billingCycle: cycle, skipTrial: true });
        subscription.locked_price = quote.taxable_amount;
        subscription.status = "active";
        await subscription.save();
      }

      // Spend credit (FIFO, row-locked) — only after payment confirmed
      let actualCreditUsed = 0;
      if (quote.credit_used > 0) {
        actualCreditUsed = await referralService.spendCredit(t, venueId, quote.credit_used, orderId);
      }

      const paymentRow = await Payment.create({
        venue_id: venueId,
        amount: paidAmount,
        method: "cashfree",
        status: "success",
        plan_name_snapshot: plan.name,
        period_covered_start: subscription.current_period_start,
        period_covered_end: subscription.current_period_end,
        cf_payment_id: cfPaymentId,
        cf_order_id: orderId,
        base_amount: quote.plan_price,
        discount_amount: quote.discount_amount,
        credit_used: actualCreditUsed,
        gst_rate: quote.gst_rate,
        gst_amount: quote.gst_amount,
        total_amount: paidAmount,
        notes: `Billing: ${cycle}`
      }, { transaction: t });

      // Handle referral reward for referrer (first payment of referred venue)
      await referralService.handlePostPaymentReferral(t, paymentRow, venueId, quote.taxable_amount);

      await t.commit();

      // Assign referral code now that venue is on a paid plan
      await referralService.maybeAssignReferralCode(venueId);

      res.json({ success: true, data: subscription });
    } catch (innerErr) {
      try { await t.rollback(); } catch (_) {}
      throw innerErr;
    }
  } catch (error) {
    next(error);
  }
}

async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];

    if (!signature || !timestamp || !env.cashfree.secretKey) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

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
      recorded_by: req.user.id,
      base_amount: amount,
      total_amount: amount
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

async function getQuote(req, res, next) {
  try {
    const { venueId, planId, billingCycle } = req.query;
    if (!venueId || !planId) throw new AppError("venueId and planId required", 400);

    const plan = await Plan.findByPk(planId);
    if (!plan) throw new AppError("Plan not found", 404);

    const referralService = require("../referrals/referral.service");
    const { computeQuote, normalizeCycle } = require("../plans/planPricing");
    const env = require("../../config/env");

    const cycle = normalizeCycle(billingCycle);
    const creditAvail = await referralService.getCreditBalance(venueId);
    const quote = computeQuote(plan, cycle, creditAvail, env.gstRate, env.referral.friendPercent);

    res.json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  recordManualPayment,
  listPayments,
  getQuote   
};