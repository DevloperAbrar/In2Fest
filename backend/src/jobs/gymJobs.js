const cron = require("node-cron");
const members = require("../modules/gym/gym.members.service");
const payments = require("../modules/gym/gym.payments.service");

const IST = { timezone: "Asia/Kolkata" };
const safe = (name, fn) => async () => {
  try { await fn(); } catch (e) { console.error(`[GYM JOB] ${name} failed:`, e.message); }
};

function startGymJobs() {
  cron.schedule("10 0 * * *", safe("status-sync", members.syncStatuses), IST);      // expire / auto-unfreeze
  cron.schedule("*/10 * * * *", safe("payment-links", payments.pollPendingLinks));  // Razorpay link status
  console.log("[JOBS] Gym jobs scheduled (status sync 00:10 IST, payment-link poll */10).");
}

module.exports = { startGymJobs };