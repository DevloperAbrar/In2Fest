const cron = require("node-cron");
const registry = require("../modules/demo/demo.registry");
const demo = require("../modules/demo/demo.service");

function startDemoCleanup() {
  registry.warm().catch(() => {});
  cron.schedule("20 * * * *", async () => {
    try {
      await demo.cleanupExpired();
    } catch (e) {
      console.error("[DEMO JOB] cleanup failed:", e.message);
    }
  });
  console.log("[JOBS] Demo cleanup scheduled (hourly).");
}

module.exports = { startDemoCleanup };