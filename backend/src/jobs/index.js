const { startTrialExpiryChecker } = require("./trialExpiryChecker");
const { startPaymentReminder } = require("./paymentReminder");
const { startReviewRequestSender } = require("./reviewRequestSender");
const { startMessageScheduler } = require("../modules/whatsapp/message.scheduler");
const { startFreeListingNudge } = require("./freeListingNudge");
const { startWeeklyStats } = require("./weeklyStats");
const { startSitemapRebuilder } = require("./sitemapRebuilder");
const { startReferralCron } = require("./referralCron");
const { startGymJobs } = require("./gymJobs");
const { startDbBackup } = require("./dbBackup");

function startJobs() {
  startTrialExpiryChecker();
  startPaymentReminder();
  startReviewRequestSender();
  startMessageScheduler();
  startFreeListingNudge();
  startWeeklyStats();
  startSitemapRebuilder();
  startReferralCron();
  startGymJobs();
  startDbBackup();
  console.log("[JOBS] All background jobs started.");
}

module.exports = { startJobs };