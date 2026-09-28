const crypto = require("crypto");
const dayjs = require("dayjs");
const { Op } = require("sequelize");
const { Venue, Subscription, Referral, ReferralCreditLedger, Payment } = require("../../database/models");
const env = require("../../config/env");

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function generateCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 7);
}

async function ensureUniqueCode() {
  let code;
  let tries = 0;
  do {
    code = generateCode();
    tries++;
    if (tries > 20) throw new Error("Could not generate unique referral code");
  } while (await Venue.findOne({ where: { referral_code: code } }));
  return code;
}

function isPaidActivePlan(sub) {
  if (!sub || !sub.plan) return false;
  if (!["active", "expiring_soon"].includes(sub.status)) return false;
  return Number(sub.plan.monthly_price) > 0;
}

async function maybeAssignReferralCode(venueId) {
  const venue = await Venue.findByPk(venueId);
  if (!venue || venue.referral_code) return venue;

  const { Plan } = require("../../database/models");
  const sub = await Subscription.findOne({
    where: { venue_id: venueId },
    include: [{ model: Plan, as: "plan" }]
  });

  if (!isPaidActivePlan(sub)) return venue;

  venue.referral_code = await ensureUniqueCode();
  await venue.save();
  return venue;
}

/**
 * Friend discount applies ONLY to a venue that was referred, whose referral is
 * still pending, and that has not made any successful payment yet.
 * Everyone else gets 0 (so computeQuote falls back to the plan's own offer).
 */
async function getFriendDiscountPercent(venueId) {
  const referral = await Referral.findOne({
    where: { referred_venue_id: venueId, status: "pending" }
  });
  if (!referral) return 0;

  const priorPayments = await Payment.count({
    where: { venue_id: venueId, status: "success" }
  });
  if (priorPayments > 0) return 0;

  return env.referral.friendPercent;
}

/**
 * Loads the live (non-expired) credit "groups" for a venue. One group per
 * referral. A group's balance is the sum of its earn + spend + expire rows.
 * If the earn row has passed expires_at the whole group is dropped, so a
 * leftover spend row can never offset another referral's credit.
 */
async function loadCreditGroups(venueId, t) {
  const txOpts = t ? { transaction: t } : {};

  const availableRefs = await Referral.findAll({
    where: { referrer_venue_id: venueId, status: "available" },
    attributes: ["id"],
    ...txOpts
  });
  const availableIds = availableRefs.map((r) => r.id);

  const rows = await ReferralCreditLedger.findAll({
    where: {
      venue_id: venueId,
      [Op.or]: [
        { referral_id: null },
        { referral_id: { [Op.in]: availableIds.length > 0 ? availableIds : [NIL_UUID] } }
      ]
    },
    order: [["createdAt", "ASC"]],
    ...(t ? { transaction: t, lock: t.LOCK.UPDATE } : {})
  });

  const now = new Date();
  const groups = new Map();

  for (const row of rows) {
    const key = row.referral_id || "none";
    if (!groups.has(key)) {
      groups.set(key, { referralId: row.referral_id || null, sum: 0, expired: false });
    }
    const g = groups.get(key);
    g.sum += Number(row.amount);
    if (row.type === "earn" && row.expires_at && new Date(row.expires_at) <= now) {
      g.expired = true;
    }
  }

  return [...groups.values()]
    .filter((g) => !g.expired)
    .map((g) => ({ referralId: g.referralId, remaining: round2(Math.max(0, g.sum)) }))
    .filter((g) => g.remaining > 0);
}

async function getCreditBalance(venueId) {
  const groups = await loadCreditGroups(venueId);
  return round2(groups.reduce((sum, g) => sum + g.remaining, 0));
}

async function getPendingCredit(venueId) {
  const rows = await Referral.findAll({
    where: { referrer_venue_id: venueId, status: "pending" }
  });
  return round2(rows.reduce((sum, r) => sum + Number(r.reward_amount || 0), 0));
}

function maskName(name) {
  if (!name || name.length < 2) return "****";
  return name[0] + "*".repeat(Math.min(name.length - 1, 4));
}

async function getReferralStats(venueId) {
  // Existing paid venues (or ones activated by another route) get their code here.
  let venue = await maybeAssignReferralCode(venueId);
  if (!venue) venue = await Venue.findByPk(venueId);

  const code = venue?.referral_code || null;
  const link = code ? `${env.clientUrl}/r/${code}` : null;

  const referrals = await Referral.findAll({
    where: { referrer_venue_id: venueId },
    include: [{ model: Venue, as: "referredVenue", attributes: ["id", "hall_name", "owner_name"] }],
    order: [["createdAt", "DESC"]]
  });

  const invited = referrals.length;
  const paid = referrals.filter((r) => r.status === "available" || r.first_payment_id).length;
  const balance = await getCreditBalance(venueId);
  const pending_amount = await getPendingCredit(venueId);

  const history = referrals.map((r) => ({
    id: r.id,
    friend_name: maskName(r.referredVenue?.owner_name || r.referredVenue?.hall_name || "—"),
    registered_at: r.createdAt,
    status: r.status === "available" || r.first_payment_id ? "Paid" : "Registered",
    reward_amount: r.reward_amount,
    available_at: r.available_at
  }));

  return { code, link, stats: { invited, registered: invited, paid }, balance, pending_amount, history };
}

async function applyReferralAtSignup(newVenue, referralCode, ownerUser) {
  if (!referralCode) return;
  const { User } = require("../../database/models");

  const referrer = await Venue.findOne({
    where: { referral_code: String(referralCode).trim().toUpperCase() },
    include: [{ model: User, as: "owner" }]
  });
  if (!referrer) return;
  if (referrer.owner_id === newVenue.owner_id) return;
  if (ownerUser && referrer.owner?.email === ownerUser.email) return;
  if (referrer.phone && newVenue.phone && referrer.phone === newVenue.phone) return;
  if (newVenue.referred_by) return;

  newVenue.referred_by = referrer.id;
  await newVenue.save();

  await Referral.findOrCreate({
    where: { referred_venue_id: newVenue.id },
    defaults: { referrer_venue_id: referrer.id, status: "pending" }
  });
}

async function handlePostPaymentReferral(t, paymentRow, venueId, baseAmountPaid) {
  const { referral: refCfg } = env;
  const { Plan } = require("../../database/models");

  const venue = await Venue.findByPk(venueId, { transaction: t });
  if (!venue?.referred_by) return;

  const referral = await Referral.findOne({
    where: { referred_venue_id: venueId, status: "pending", first_payment_id: null },
    lock: t.LOCK.UPDATE,
    transaction: t
  });
  if (!referral) return;

  const refSub = await Subscription.findOne({
    where: { venue_id: referral.referrer_venue_id },
    include: [{ model: Plan, as: "plan" }],
    transaction: t
  });
  if (!isPaidActivePlan(refSub)) return;

  const rewardPercent = refCfg.referrerPercent;
  const rewardAmount = round2((baseAmountPaid * rewardPercent) / 100);
  const availableAt = dayjs().add(refCfg.holdDays, "day").toDate();
  const expiresAt = dayjs(availableAt).add(refCfg.creditExpiryMonths, "month").toDate();

  referral.first_payment_id = paymentRow.id;
  referral.base_amount = baseAmountPaid;
  referral.reward_percent = rewardPercent;
  referral.reward_amount = rewardAmount;
  referral.available_at = availableAt;
  await referral.save({ transaction: t });

  await ReferralCreditLedger.create({
    venue_id: referral.referrer_venue_id,
    type: "earn",
    amount: rewardAmount,
    referral_id: referral.id,
    payment_id: paymentRow.id,
    expires_at: expiresAt,
    note: `Referral reward (hold until ${dayjs(availableAt).format("DD MMM YYYY")})`
  }, { transaction: t });
}

async function spendCredit(t, venueId, amountToSpend, paymentId) {
  if (!(amountToSpend > 0)) return 0;

  const groups = await loadCreditGroups(venueId, t);

  let remaining = amountToSpend;
  let totalSpent = 0;

  for (const g of groups) {
    if (remaining <= 0) break;
    const spend = Math.min(g.remaining, remaining);
    if (spend <= 0) continue;

    await ReferralCreditLedger.create({
      venue_id: venueId,
      type: "spend",
      amount: -spend,
      referral_id: g.referralId,
      payment_id: paymentId,
      note: `Spent for payment ${paymentId}`
    }, { transaction: t });

    remaining -= spend;
    totalSpent += spend;
  }

  return round2(totalSpent);
}

async function reverseCredit(t, venueId, paymentId, amountToReverse) {
  if (!(amountToReverse > 0)) return;
  await ReferralCreditLedger.create({
    venue_id: venueId,
    type: "reverse",
    amount: amountToReverse,
    payment_id: paymentId,
    note: `Reversal for payment ${paymentId}`
  }, { transaction: t });
}

module.exports = {
  maybeAssignReferralCode,
  getFriendDiscountPercent,
  getCreditBalance,
  getPendingCredit,
  getReferralStats,
  applyReferralAtSignup,
  handlePostPaymentReferral,
  spendCredit,
  reverseCredit
};