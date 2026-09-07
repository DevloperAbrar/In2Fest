const app = require("./app");
const env = require("./config/env");
const { connectDatabase, sequelize } = require("./config/database");
require("./database/models"); // ensures all models + associations are registered
const { startJobs } = require("./jobs");
const { getRedisClient } = require("./config/redis");

async function startServer() {
  await connectDatabase();

  // In production, use migrations (npm run migrate) instead of sync.
  if (env.nodeEnv === "development") {
    await sequelize.sync({ alter: true });
    console.log("[DB] Models synced (development mode).");
  }

  const server = app.listen(env.port, () => {
    console.log(`[SERVER] In2Fest backend running on port ${env.port} [${env.nodeEnv}]`);
  });

  startJobs();

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[SERVER] ${signal} received. Shutting down gracefully.`);

    server.close(async () => {
      try {
        await sequelize.close();
        console.log("[DB] Connection pool closed.");
      } catch (err) {
        console.error("[DB] Error closing connection pool:", err.message);
      }

      try {
        const redis = await getRedisClient();
        if (redis) await redis.quit();
      } catch (err) {
        console.error("[REDIS] Error closing connection:", err.message);
      }

      process.exit(0);
    });

    // Force-exit if something hangs and never closes cleanly.
    setTimeout(() => {
      console.error("[SERVER] Forced shutdown after 10s timeout.");
      process.exit(1);
    }, 10000).unref();
  }

  process.on("unhandledRejection", (err) => {
    console.error("[UNHANDLED REJECTION]", err);
    shutdown("UNHANDLED_REJECTION");
  });

  process.on("uncaughtException", (err) => {
    console.error("[UNCAUGHT EXCEPTION]", err);
    shutdown("UNCAUGHT_EXCEPTION");
  });

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer();