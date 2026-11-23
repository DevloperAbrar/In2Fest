const cron = require("node-cron");
const geo = require("../modules/discovery/geo.service");

// Gives every vendor a stored map location. Runs shortly after start (first fill), then every
// 10 minutes. It only touches vendors that still have no exact location, so it is cheap once done.
function startGeoBackfill() {
  const run = (limit) =>
    geo.backfillMissing(limit)
      .then((n) => { if (n) console.log(`[JOB] Map locations saved for ${n} vendors.`); })
      .catch((e) => console.error("[JOB] Geo backfill failed:", e.message));

  cron.schedule("*/10 * * * *", () => run(40), { timezone: "Asia/Kolkata" });
  setTimeout(() => run(80), 20000);
  console.log("[JOBS] Map location backfill scheduled (20 s after start, then every 10 min).");
}

module.exports = { startGeoBackfill };