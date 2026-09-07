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

module.exports = {
  createSubscription,
  getMySubscription,
  changePlan,
  extendTrial,
  suspendSubscription,
  reactivateSubscription
};