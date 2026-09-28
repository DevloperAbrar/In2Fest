const referralService = require("./referral.service");
const { Venue, Plan } = require("../../database/models");
const { computeQuote, normalizeCycle } = require("../plans/planPricing");
const { AppError } = require("../../middleware/error.middleware");
const env = require("../../config/env");

async function getMyReferrals(req, res, next) {
  try {
    const venue = await Venue.findOne({ where: { owner_id: req.user.id } });
    if (!venue) throw new AppError("Venue not found", 404);
    const data = await referralService.getReferralStats(venue.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getQuote(req, res, next) {
  try {
    const { venueId, planId, billingCycle } = req.query;
    if (!venueId || !planId) throw new AppError("venueId and planId required", 400);

    const venue = await Venue.findOne({ where: { id: venueId, owner_id: req.user.id } });
    if (!venue) throw new AppError("Venue not found or access denied", 404);

    const plan = await Plan.findByPk(planId);
    if (!plan) throw new AppError("Plan not found", 404);

    const cycle = normalizeCycle(billingCycle);
    const creditAvail = await referralService.getCreditBalance(venueId);
    const friendPercent = await referralService.getFriendDiscountPercent(venueId);
    const quote = computeQuote(plan, cycle, creditAvail, env.gstRate, friendPercent);
    res.json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
}

async function resolveReferralCode(req, res, next) {
  try {
    const { code } = req.params;
    const venue = await Venue.findOne({ where: { referral_code: code } });
    if (!venue) {
      return res.redirect(`${env.clientUrl}/login?ref_invalid=1`);
    }
    res.redirect(`${env.clientUrl}/login?ref=${code}`);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyReferrals, getQuote, resolveReferralCode };