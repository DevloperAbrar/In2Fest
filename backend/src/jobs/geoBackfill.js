const cron = require("node-cron");
const geo = require("../modules/discovery/geo.service");

// Gives every vendor a stored map location. Runs shortly after start (first fill), then every 30 minutes
// for new vendors and for vendors that were not found last time.
function startGeoBackfill() {
  const run = (limit) =>
    geo.backfillMissing(limit)
      .then((n) => { if (n) console.log(`[JOB] Map locations saved for ${n} vendors.`); })
      .catch((e) => console.error("[JOB] Geo backfill failed:", e.message));

  cron.schedule("*/30 * * * *", () => run(25), { timezone: "Asia/Kolkata" });
  setTimeout(() => run(80), 20000);
  console.log("[JOBS] Map location backfill scheduled (20 s after start, then every 30 min).");
}

module.exports = { startGeoBackfill };