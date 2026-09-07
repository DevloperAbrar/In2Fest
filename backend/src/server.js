const app = require("./app");
const env = require("./config/env");
const { connectDatabase, sequelize } = require("./config/database");
require("./database/models"); // ensures all models + associations are registered
const { startJobs } = require("./jobs");

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

  process.on("unhandledRejection", (err) => {
    console.error("[UNHANDLED REJECTION]", err);
    server.close(() => process.exit(1));
  });

  process.on("SIGTERM", () => {
    console.log("[SERVER] SIGTERM received. Shutting down gracefully.");
    server.close(() => process.exit(0));
  });
}

startServer();