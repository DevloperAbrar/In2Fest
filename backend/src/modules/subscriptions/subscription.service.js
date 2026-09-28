const dayjs = require("dayjs");
const { Subscription, Plan, Venue } = require("../../database/models");
const { getAmountForCycle, normalizeCycle } = require("../plans/planPricing");
const { AppError } = require("../../middleware/error.middleware");

/**
 * Creates a subscription with locked_price = current plan price at signup time.
 * This locked price never changes even if the plan's price changes later.
 */
async function createSubscription(venueId, planId, options = {}) {
  const plan = await Plan.findByPk(planId);
  if (!plan || !plan.is_active) throw new AppError("Plan not found or inactive", 404);

  const existing = await Subscription.findOne({ where: { venue_id: venueId } });
  if (existing) throw new AppError("Venue already has a subscription", 400);

  const cycle = normalizeCycle(options.billingCycle);
  const hasTrial = plan.trial_days > 0 && !options.skipTrial;
  const now = dayjs();
  const fullPeriodEnd = cycle === "yearly" ? now.add(1, "year") : now.add(1, "month");

  const subscription = await Subscription.create({
    venue_id: venueId,
    plan_id: plan.id,
    locked_price: getAmountForCycle(plan, cycle),
    billing_cycle: cycle,
    status: hasTrial ? "trial" : "active",
    trial_ends_at: hasTrial ? now.add(plan.trial_days, "day").toDate() : null,
    current_period_start: now.toDate(),
    current_period_end: hasTrial ? now.add(plan.trial_days, "day").toDate() : fullPeriodEnd.toDate()
  });

  return subscription;
}

/**
 * Auto-assigns the free-forever plan to a newly created venue that skipped
 * paid plan selection during onboarding.
 */
async function createFreeSubscription(venueId) {
  const existing = await Subscription.findOne({ where: { venue_id: venueId } });
  if (existing) throw new AppError("Venue already has a subscription", 400);

  const freePlan = await Plan.findOne({ where: { name: "Free", is_active: true } });
  if (!freePlan) throw new AppError("Free plan is not configured  - run the plans seeder", 500);

  const now = dayjs();

  const subscription = await Subscription.create({
    venue_id: venueId,
    plan_id: freePlan.id,
    locked_price: 0,
    status: "active",
    trial_ends_at: null,
    current_period_start: now.toDate(),
    current_period_end: now.add(100, "year").toDate()
  });

  return subscription;
}

async function getSubscriptionByVenue(venueId) {
  const subscription = await Subscription.findOne({
    where: { venue_id: venueId },
    include: [{ model: Plan, as: "plan" }]
  });
  if (!subscription) throw new AppError("Subscription not found", 404);
  return subscription;
}

/**
 * Renewal extends from current_period_end (not from now).
 * So paying early doesn't waste the remaining time — vendor gets a full
 * extra year/month stacked on top of their existing period.
 * Price is kept locked unless options.amount is explicitly passed (e.g. after payment).
 */
async function renewSubscription(venueId, options = {}) {
  const subscription = await getSubscriptionByVenue(venueId);

  const cycle = options.billingCycle
    ? normalizeCycle(options.billingCycle)
    : normalizeCycle(subscription.billing_cycle);

  // Extend from current_period_end (stack renewal), or from now if already expired
  const base = dayjs(subscription.current_period_end);
  const extendFrom = base.isAfter(dayjs()) ? base : dayjs();
  const newEnd = cycle === "yearly" ? extendFrom.add(1, "year") : extendFrom.add(1, "month");

  subscription.billing_cycle = cycle;
  if (options.amount !== undefined) subscription.locked_price = options.amount;
  subscription.status = "active";
  subscription.current_period_start = extendFrom.toDate();
  subscription.current_period_end = newEnd.toDate();
  await subscription.save();

  return subscription;
}

/**
 * FREE-PLAN SWITCH ONLY.
 */
async function changePlan(venueId, newPlanId) {
  const plan = await Plan.findByPk(newPlanId);
  if (!plan || !plan.is_active) throw new AppError("Plan not found or inactive", 404);

  if (Number(plan.monthly_price) > 0) {
    throw new AppError(
      "This plan requires payment. Please complete checkout to switch plans.",
      402
    );
  }

  const subscription = await getSubscriptionByVenue(venueId);
  const now = dayjs();

  subscription.plan_id = plan.id;
  subscription.locked_price = 0;
  subscription.billing_cycle = "monthly";
  subscription.status = "active";
  subscription.trial_ends_at = null;
  subscription.current_period_start = now.toDate();
  subscription.current_period_end = now.add(100, "year").toDate();
  await subscription.save();

  return subscription;
}

/**
 * PAID-PLAN SWITCH. Only ever called from payment.controller.verifyPayment,
 * AFTER Cashfree has confirmed the order as PAID.
 */
async function switchPlanAfterPayment(venueId, newPlanId, options = {}) {
  const plan = await Plan.findByPk(newPlanId);
  if (!plan || !plan.is_active) throw new AppError("Plan not found or inactive", 404);

  const subscription = await getSubscriptionByVenue(venueId);
  const now = dayjs();
  const cycle = normalizeCycle(options.billingCycle);

  subscription.plan_id = plan.id;
  subscription.locked_price = options.amount !== undefined ? options.amount : getAmountForCycle(plan, cycle);
  subscription.billing_cycle = cycle;
  subscription.status = "active";
  subscription.trial_ends_at = null;
  subscription.current_period_start = now.toDate();
  subscription.current_period_end = (cycle === "yearly" ? now.add(1, "year") : now.add(1, "month")).toDate();
  await subscription.save();

  return subscription;
}

async function extendTrial(venueId, extraDays) {
  const subscription = await getSubscriptionByVenue(venueId);
  const base = subscription.trial_ends_at ? dayjs(subscription.trial_ends_at) : dayjs();
  subscription.trial_ends_at = base.add(extraDays, "day").toDate();
  subscription.current_period_end = subscription.trial_ends_at;
  subscription.status = "trial";
  await subscription.save();
  return subscription;
}

async function suspendSubscription(venueId) {
  const subscription = await getSubscriptionByVenue(venueId);
  subscription.status = "suspended";
  await subscription.save();
  return subscription;
}

async function reactivateSubscription(venueId) {
  const subscription = await getSubscriptionByVenue(venueId);
  subscription.status = "active";
  await subscription.save();
  return subscription;
}

/**
 * Runs on a cron job - recalculates status for all subscriptions based on dates.
 */
async function recalculateAllStatuses() {
  const now = dayjs();
  const subscriptions = await Subscription.findAll({
    where: { status: ["trial", "active", "expiring_soon"] }
  });

  for (const sub of subscriptions) {
    const periodEnd = dayjs(sub.current_period_end);
    const daysLeft = periodEnd.diff(now, "day");

    let newStatus = sub.status;
    if (daysLeft < 0) {
      newStatus = "expired";
    } else if (daysLeft <= 7) {
      newStatus = "expiring_soon";
    } else if (sub.status === "trial" && daysLeft > 7) {
      newStatus = "trial";
    } else {
      newStatus = "active";
    }

    if (newStatus !== sub.status) {
      sub.status = newStatus;
      await sub.save();
    }
  }
}

async function getExpiringSoon(days = 7) {
  const cutoff = dayjs().add(days, "day").toDate();
  return Subscription.findAll({
    where: { status: ["trial", "active", "expiring_soon"] },
    include: [
      { model: Plan, as: "plan" },
      { model: Venue, attributes: ["id", "hall_name", "phone", "owner_id"] }
    ]
  }).then((subs) => subs.filter((s) => dayjs(s.current_period_end).isBefore(cutoff)));
}

module.exports = {
  createSubscription,
  createFreeSubscription,
  getSubscriptionByVenue,
  renewSubscription,
  changePlan,
  switchPlanAfterPayment,
  extendTrial,
  suspendSubscription,
  reactivateSubscription,
  recalculateAllStatuses,
  getExpiringSoon
};