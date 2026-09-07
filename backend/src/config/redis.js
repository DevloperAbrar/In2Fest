const { createClient } = require("redis");

let client = null;
let failed = false; // once it fails, stop retrying

async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (failed) return null; // Redis already failed  - skip silently

  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });

    client.on("error", (err) => {
      if (!failed) {
        // Print the error once, then go silent
        console.warn("[REDIS] Not available  - caching disabled:", err.message);
        failed = true;
        client.quit().catch(() => {});
        client = null;
      }
    });

    try {
      await client.connect();
      console.log("[REDIS] Connected.");
    } catch (err) {
      console.warn("[REDIS] Could not connect  - caching disabled:", err.message);
      failed = true;
      client = null;
      return null;
    }
  }

  return client;
}

module.exports = { getRedisClient };