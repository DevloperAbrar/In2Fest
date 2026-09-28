const subscriptionService = require("./subscription.service");

async function createSubscription(req, res, next) {
  try {
    const { venueId, planId } = req.body;
    const subscription = await subscriptionService.createSubscription(venueId, planId);
    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}

async function getMySubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.getSubscriptionByVenue(req.params.venueId);
    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}

async function changePlan(req, res, next) {
  try {
    const subscription = await subscriptionService.changePlan(req.params.venueId, req.body.planId);
    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}

async function extendTrial(req, res, next) {
  try {
    const subscription = await subscriptionService.extendTrial(req.params.venueId, req.body.extraDays || 7);
    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}

async function suspendSubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.suspendSubscription(req.params.venueId);
    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}

async function reactivateSubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.reactivateSubscription(req.params.venueId);
    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /subscriptions/:venueId/renewal-quote
 * Returns the price quote for renewing the current plan for another cycle.
 * Used by frontend to show the amount before hitting Cashfree.
 */
async function getRenewalQuote(req, res, next) {
  try {
    const { venueId } = req.params;
    // Delegate to payment controller logic via service - just return subscription info
    // The actual quote is computed in payment.controller getQuote with type=renewal
    const subscription = await subscriptionService.getSubscriptionByVenue(venueId);
    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSubscription,
  getMySubscription,
  changePlan,
  extendTrial,
  suspendSubscription,
  reactivateSubscription,
  getRenewalQuote
};