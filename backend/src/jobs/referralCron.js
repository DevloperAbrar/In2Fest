const cron = require("node-cron");
const dayjs = require("dayjs");
const { Op } = require("sequelize");
const { Referral, ReferralCreditLedger } = require("../database/models");

/**
 * Move referrals from pending -> available after hold days.
 * Expire old credit ledger rows.
 */
async function runReferralCron() {
  try {
    const now = new Date();

    // 1. Pending referrals whose hold period has passed -> available
    const ready = await Referral.findAll({
      where: {
        status: "pending",
        available_at: { [Op.lte]: now },
        first_payment_id: { [Op.ne]: null }
      }
    });

    for (const ref of ready) {
      ref.status = "available";
      await ref.save();
      console.log(`[REFERRAL CRON] Referral ${ref.id} -> available`);
    }

    // 2. Expire old ledger earn rows past expires_at
    const expired = await ReferralCreditLedger.findAll({
      where: {
        type: "earn",
        expires_at: { [Op.lte]: now }
      }
    });

    for (const row of expired) {
      // Check if there's already an expire entry for this row
      const alreadyExpired = await ReferralCreditLedger.findOne({
        where: { type: "expire", referral_id: row.referral_id, venue_id: row.venue_id }
      });
      if (alreadyExpired) continue;

      // Only expire the positive (unspent) portion
      const spends = await ReferralCreditLedger.sum("amount", {
        where: { type: "spend", referral_id: row.referral_id, venue_id: row.venue_id }
      });
      const spent = Math.abs(Number(spends) || 0);
      const earned = Number(row.amount);
      const unspent = Math.max(0, earned - spent);

      if (unspent > 0) {
        await ReferralCreditLedger.create({
          venue_id: row.venue_id,
          type: "expire",
          amount: -unspent,
          referral_id: row.referral_id,
          note: `Credit expired (earn row ${row.id})`
        });
        console.log(`[REFERRAL CRON] Expired ₹${unspent} for venue ${row.venue_id}`);
      }
    }
  } catch (err) {
    console.error("[REFERRAL CRON] Error:", err.message);
  }
}

function startReferralCron() {
  // Run every hour
  cron.schedule("0 * * * *", runReferralCron);
  console.log("[JOBS] Referral cron started.");
}

module.exports = { startReferralCron };