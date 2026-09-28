const crypto = require("crypto");
const dayjs = require("dayjs");
const { Op } = require("sequelize");
const { Venue, Subscription, Referral, ReferralCreditLedger, Payment } = require("../../database/models");
const env = require("../../config/env");

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

  const code = await ensureUniqueCode();
  venue.referral_code = code;
  await venue.save();
  return venue;
}

async function getCreditBalance(venueId) {
  const availableReferralIds = await Referral.findAll({
    where: { referrer_venue_id: venueId, status: "available" },
    attributes: ["id"]
  });
  const availableIds = availableReferralIds.map((r) => r.id);

  const rows = await ReferralCreditLedger.findAll({
    where: {
      venue_id: venueId,
      [Op.or]: [
        { expires_at: null },
        { expires_at: { [Op.gt]: new Date() } }
      ],
      [Op.or]: [
        { referral_id: null },
        { referral_id: { [Op.in]: availableIds.length > 0 ? availableIds : ["00000000-0000-0000-0000-000000000000"] } }
      ]
    }
  });

  const balance = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  return Math.max(0, Math.round(balance * 100) / 100);
}

async function getPendingCredit(venueId) {
  const rows = await Referral.findAll({
    where: { referrer_venue_id: venueId, status: "pending" }
  });
  const total = rows.reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);
  return Math.round(total * 100) / 100;
}

async function getReferralStats(venueId) {
  const venue = await Venue.findByPk(venueId);
  const siteUrl = `https://${env.baseDomain}`;
  const code = venue?.referral_code || null;
  const link = code ? `${siteUrl}/r/${code}` : null;

  const referrals = await Referral.findAll({
    where: { referrer_venue_id: venueId },
    include: [{ model: Venue, as: "referredVenue", attributes: ["id", "hall_name", "owner_name", "created_at"] }],
    order: [["created_at", "DESC"]]
  });

  const invited = referrals.length;
  const paid = referrals.filter((r) => r.status === "available" || r.first_payment_id).length;
  const balance = await getCreditBalance(venueId);
  const pending_amount = await getPendingCredit(venueId);

  const history = referrals.map((r) => ({
    id: r.id,
    friend_name: maskName(r.referredVenue?.owner_name || r.referredVenue?.hall_name || "—"),
    registered_at: r.created_at,
    status: r.status === "available" ? "Paid" : r.first_payment_id ? "Paid" : "Registered",
    reward_amount: r.reward_amount,
    available_at: r.available_at
  }));

  return { code, link, stats: { invited, registered: invited, paid }, balance, pending_amount, history };
}

function maskName(name) {
  if (!name || name.length < 2) return "****";
  return name[0] + "*".repeat(Math.min(name.length - 1, 4));
}

async function applyReferralAtSignup(newVenue, referralCode, ownerUser) {
  if (!referralCode) return;
  const { User } = require("../../database/models");

  const referrer = await Venue.findOne({
    where: { referral_code: referralCode },
    include: [{ model: User, as: "owner" }]
  });
  if (!referrer) return;
  if (referrer.owner_id === newVenue.owner_id) return;
  if (ownerUser && referrer.owner?.email === ownerUser.email) return;
  if (referrer.phone && newVenue.phone && referrer.phone === newVenue.phone) return;
  if (newVenue.referred_by) return;

  newVenue.referred_by = referrer.id;
  await newVenue.save();

  await Referral.create({
    referrer_venue_id: referrer.id,
    referred_venue_id: newVenue.id,
    status: "pending"
  });
}

async function handlePostPaymentReferral(t, paymentRow, venueId, baseAmountPaid) {
  const { referral: refCfg } = env;
  const { Plan } = require("../../database/models");

  const venue = await Venue.findByPk(venueId, { transaction: t });
  if (!venue?.referred_by) return;

  const referral = await Referral.findOne({
    where: { referred_venue_id: venueId, status: "pending" },
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
  const rewardAmount = Math.round((baseAmountPaid * rewardPercent) / 100 * 100) / 100;
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
  if (amountToSpend <= 0) return 0;

  const availableReferralIds = await Referral.findAll({
    where: { referrer_venue_id: venueId, status: "available" },
    attributes: ["id"],
    transaction: t
  });
  const availableIds = availableReferralIds.map((r) => r.id);

  const rows = await ReferralCreditLedger.findAll({
    where: {
      venue_id: venueId,
      type: "earn",
      [Op.or]: [
        { expires_at: null },
        { expires_at: { [Op.gt]: new Date() } }
      ],
      [Op.or]: [
        { referral_id: null },
        { referral_id: { [Op.in]: availableIds.length > 0 ? availableIds : ["00000000-0000-0000-0000-000000000000"] } }
      ]
    },
    order: [["created_at", "ASC"]],
    lock: t.LOCK.UPDATE,
    transaction: t
  });

  let remaining = amountToSpend;
  let totalSpent = 0;

  for (const row of rows) {
    if (remaining <= 0) break;
    const available = Number(row.amount);
    if (available <= 0) continue;
    const spend = Math.min(available, remaining);

    await ReferralCreditLedger.create({
      venue_id: venueId,
      type: "spend",
      amount: -spend,
      referral_id: row.referral_id,
      payment_id: paymentId,
      note: `Spent for payment ${paymentId}`
    }, { transaction: t });

    remaining -= spend;
    totalSpent += spend;
  }

  return Math.round(totalSpent * 100) / 100;
}

async function reverseCredit(t, venueId, paymentId, amountToReverse) {
  if (amountToReverse <= 0) return;
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
  getCreditBalance,
  getPendingCredit,
  getReferralStats,
  applyReferralAtSignup,
  handlePostPaymentReferral,
  spendCredit,
  reverseCredit
};