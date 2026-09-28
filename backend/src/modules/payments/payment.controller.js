const crypto = require("crypto");
const { getCashfreeClient } = require("../../config/cashfree");
const { Payment, Subscription, Plan, Venue, User } = require("../../database/models");
const { sequelize } = require("../../config/database");
const subscriptionService = require("../subscriptions/subscription.service");
const referralService = require("../referrals/referral.service");
const { AppError } = require("../../middleware/error.middleware");
const env = require("../../config/env");
const { normalizeCycle, computeQuote } = require("../plans/planPricing");

/**
 * Makes sure the logged-in owner really owns this venue.
 */
async function loadOwnedVenue(venueId, userId, options = {}) {
  const venue = await Venue.findOne({ where: { id: venueId, owner_id: userId }, ...options });
  if (!venue) throw new AppError("Venue not found or access denied", 404);
  return venue;
}

/**
 * Treats anything except an explicit false/"false"/0/"0" as "use credit".
 * Keeps old callers (onboarding, plan switch) working: they never send the flag.
 */
function parseUseCredit(value) {
  return !(value === false || value === "false" || value === 0 || value === "0");
}

/**
 * Single place that builds a quote so create-order, verify and quote
 * endpoints can never disagree.
 * useCredit=false -> credit is NOT deducted, but credit_available still reports
 * the venue's real balance so the UI can show the checkbox.
 */
async function buildQuote(plan, cycle, venueId, useCredit = true) {
  const creditBalance = await referralService.getCreditBalance(venueId);
  const friendPercent = await referralService.getFriendDiscountPercent(venueId);
  const quote = computeQuote(
    plan,
    cycle,
    useCredit ? creditBalance : 0,
    env.gstRate,
    friendPercent
  );
  quote.credit_available = creditBalance;
  return quote;
}

/**
 * Creates a Cashfree order for a venue's subscription payment (new plan or renewal).
 * Pass type: "renewal" in body to renew the current plan instead of switching.
 * Pass useCredit: false to skip deducting referral credit.
 */
async function createOrder(req, res, next) {
  try {
    const { venueId, planId, returnPath, billingCycle, type, useCredit } = req.body;
    const isRenewal = type === "renewal";
    const applyCredit = parseUseCredit(useCredit);
    const cycle = normalizeCycle(billingCycle);
    const cashfree = getCashfreeClient();
    if (!cashfree) throw new AppError("Payment gateway not configured", 503);

    let resolvedPlanId = planId;
    if (isRenewal && !planId) {
      const sub = await subscriptionService.getSubscriptionByVenue(venueId);
      resolvedPlanId = sub.plan_id;
    }

    const plan = await Plan.findByPk(resolvedPlanId);
    if (!plan) throw new AppError("Plan not found", 404);
    if (!plan.is_active) throw new AppError("This plan is no longer available", 400);

    const venue = await loadOwnedVenue(venueId, req.user.id, {
      include: [{ model: User, as: "owner" }]
    });

    const quote = await buildQuote(plan, cycle, venueId, applyCredit);

    if (quote.is_free) {
      return res.json({
        success: true,
        data: {
          orderId: null,
          paymentSessionId: null,
          mode: env.cashfree.env,
          quote,
          creditOnly: true,
          type: isRenewal ? "renewal" : "switch"
        }
      });
    }

    if (quote.total_payable < 1) throw new AppError("This plan does not require payment", 400);

    const digitsOnly = (venue.phone || "").replace(/\D/g, "");
    const customerPhone = digitsOnly.slice(-10).padStart(10, "9");

    const orderPrefix = isRenewal ? "renew" : "order";
    const orderId = `${orderPrefix}_${venueId}_${Date.now()}`;
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
        order_tags: {
          billing_cycle: cycle,
          type: isRenewal ? "renewal" : "switch",
          use_credit: applyCredit ? "true" : "false"
        },
        order_note: `${isRenewal ? "Renewal" : "Subscription"}: ${plan.name} plan (${cycle}) for venue ${venueId}`
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
        creditOnly: false,
        type: isRenewal ? "renewal" : "switch",
        resolvedPlanId
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirms payment after Cashfree checkout closes, OR activates credit-only order.
 * Supports type: "renewal" to extend from current_period_end instead of resetting.
 */
async function verifyPayment(req, res, next) {
  try {
    const { orderId, venueId, planId, creditOnly, type } = req.body;
    const isRenewal = type === "renewal";

    if (!venueId) throw new AppError("venueId required", 400);

    await loadOwnedVenue(venueId, req.user.id);

    let resolvedPlanId = planId;
    if (isRenewal && !planId) {
      const sub = await subscriptionService.getSubscriptionByVenue(venueId);
      resolvedPlanId = sub.plan_id;
    }
    if (!resolvedPlanId) throw new AppError("planId required", 400);

    const plan = await Plan.findByPk(resolvedPlanId);
    if (!plan) throw new AppError("Plan not found", 404);

    const t = await sequelize.transaction();
    try {
      let cycle, paidAmount, cfPaymentId = null;

      // ─────────────────────────────────────────────
      // CREDIT-ONLY ORDER (no gateway involved)
      // ─────────────────────────────────────────────
      if (creditOnly) {
        cycle = normalizeCycle(req.body.billingCycle);
        const applyCredit = parseUseCredit(req.body.useCredit);
        const quote = await buildQuote(plan, cycle, venueId, applyCredit);
        if (!quote.is_free) {
          throw new AppError("Credit does not fully cover this order", 400);
        }

        const dummyPaymentId = `credit_${venueId}_${Date.now()}`;

        const existingSub = await Subscription.findOne({ where: { venue_id: venueId }, transaction: t });
        let subscription;
        if (isRenewal) {
          subscription = await subscriptionService.renewSubscription(venueId, {
            billingCycle: cycle,
            amount: quote.taxable_amount,
            transaction: t
          });
        } else if (existingSub) {
          subscription = existingSub.plan_id === resolvedPlanId
            ? await subscriptionService.renewSubscription(venueId, {
                billingCycle: cycle,
                amount: quote.taxable_amount,
                transaction: t
              })
            : await subscriptionService.switchPlanAfterPayment(venueId, resolvedPlanId, {
                billingCycle: cycle,
                amount: quote.taxable_amount,
                transaction: t
              });
        } else {
          subscription = await subscriptionService.createSubscription(venueId, resolvedPlanId, {
            billingCycle: cycle,
            skipTrial: true,
            transaction: t
          });
          subscription.locked_price = quote.taxable_amount;
          subscription.status = "active";
          await subscription.save({ transaction: t });
        }

        // 1) Create the payment row FIRST so we have a real UUID
        const paymentRow = await Payment.create({
          venue_id: venueId,
          amount: 0,
          method: "credit",
          status: "success",
          plan_name_snapshot: plan.name,
          period_covered_start: subscription.current_period_start,
          period_covered_end: subscription.current_period_end,
          cf_payment_id: dummyPaymentId,
          cf_order_id: dummyPaymentId,
          base_amount: quote.plan_price,
          discount_amount: quote.discount_amount,
          credit_used: 0,
          gst_rate: quote.gst_rate,
          gst_amount: 0,
          total_amount: 0,
          notes: `Credit-only ${isRenewal ? "renewal" : "switch"}: ${cycle}`
        }, { transaction: t });

        // 2) Spend credit using the payment's UUID (NOT the order string)
        const actualCreditUsed = await referralService.spendCredit(
          t,
          venueId,
          quote.credit_used,
          paymentRow.id
        );

        // 3) Save the real credit used on the payment row
        await paymentRow.update({ credit_used: actualCreditUsed }, { transaction: t });

        await referralService.handlePostPaymentReferral(t, paymentRow, venueId, quote.taxable_amount);
        await t.commit();
        await referralService.maybeAssignReferralCode(venueId);
        return res.json({ success: true, data: subscription });
      }

      // ─────────────────────────────────────────────
      // CASHFREE PAYMENT — verify with gateway
      // ─────────────────────────────────────────────
      if (!orderId) throw new AppError("orderId required for non-credit payments", 400);

      // ★ NEW: idempotency — if this order was already processed, do NOT extend again
      const alreadyProcessed = await Payment.findOne({
        where: { cf_order_id: orderId, venue_id: venueId },
        transaction: t
      });
      if (alreadyProcessed) {
        await t.rollback();
        const currentSub = await subscriptionService.getSubscriptionByVenue(venueId);
        return res.json({ success: true, data: currentSub });
      }

      const cashfree = getCashfreeClient();
      if (!cashfree) throw new AppError("Payment gateway not configured", 503);

      let cfOrder;
      try {
        const { data } = await cashfree.get(`/orders/${orderId}`);
        cfOrder = data;
      } catch (cashfreeError) {
        throw new AppError("Could not verify payment with gateway", 502);
      }

      if (cfOrder.order_status !== "PAID") {
        throw new AppError("Payment not completed", 402);
      }

      const payments_list = cfOrder.order_payments || [];
      const successPay = payments_list.find((p) => p.payment_status === "SUCCESS");
      cfPaymentId = successPay?.cf_payment_id || cfOrder.cf_order_id || orderId;
      paidAmount = cfOrder.order_amount;
      cycle = normalizeCycle(cfOrder.order_tags?.billing_cycle || req.body.billingCycle);

      // Trust the flag stored on the Cashfree order, fall back to request body
      const tagUseCredit = cfOrder.order_tags?.use_credit;
      const applyCredit = parseUseCredit(
        tagUseCredit !== undefined ? tagUseCredit : req.body.useCredit
      );

      const quote = await buildQuote(plan, cycle, venueId, applyCredit);

      let subscription;
      if (isRenewal) {
        subscription = await subscriptionService.renewSubscription(venueId, {
          billingCycle: cycle,
          amount: quote.taxable_amount,
          transaction: t
        });
      } else {
        const existingSub = await Subscription.findOne({ where: { venue_id: venueId }, transaction: t });
        if (existingSub) {
          subscription = existingSub.plan_id === resolvedPlanId
            ? await subscriptionService.renewSubscription(venueId, {
                billingCycle: cycle,
                amount: quote.taxable_amount,
                transaction: t
              })
            : await subscriptionService.switchPlanAfterPayment(venueId, resolvedPlanId, {
                billingCycle: cycle,
                amount: quote.taxable_amount,
                transaction: t
              });
        } else {
          subscription = await subscriptionService.createSubscription(venueId, resolvedPlanId, {
            billingCycle: cycle,
            skipTrial: true,
            transaction: t
          });
          subscription.locked_price = quote.taxable_amount;
          subscription.status = "active";
          await subscription.save({ transaction: t });
        }
      }

      // 1) Create the payment row FIRST so we have a real UUID
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
        credit_used: 0,
        gst_rate: quote.gst_rate,
        gst_amount: quote.gst_amount,
        total_amount: paidAmount,
        notes: `${isRenewal ? "Renewal" : "Billing"}: ${cycle}`
      }, { transaction: t });

      // 2) Spend referral credit using the payment's UUID (NOT orderId)
      let actualCreditUsed = 0;
      if (quote.credit_used > 0) {
        actualCreditUsed = await referralService.spendCredit(
          t,
          venueId,
          quote.credit_used,
          paymentRow.id
        );
      }

      // 3) Save the real credit used on the payment row
      if (actualCreditUsed !== paymentRow.credit_used) {
        await paymentRow.update({ credit_used: actualCreditUsed }, { transaction: t });
      }

      await referralService.handlePostPaymentReferral(t, paymentRow, venueId, quote.taxable_amount);
      await t.commit();
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
    await referralService.maybeAssignReferralCode(venueId);

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
}

async function listPayments(req, res, next) {
  try {
    const { venueId } = req.query;
    const where = venueId ? { venue_id: venueId } : {};
    const payments = await Payment.findAll({ where, order: [["createdAt", "DESC"]] });
    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
}

async function getQuote(req, res, next) {
  try {
    const { venueId, planId, billingCycle, useCredit } = req.query;
    if (!venueId || !planId) throw new AppError("venueId and planId required", 400);

    await loadOwnedVenue(venueId, req.user.id);

    const plan = await Plan.findByPk(planId);
    if (!plan) throw new AppError("Plan not found", 404);

    const quote = await buildQuote(
      plan,
      normalizeCycle(billingCycle),
      venueId,
      parseUseCredit(useCredit)
    );
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