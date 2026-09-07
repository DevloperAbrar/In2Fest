require("dotenv").config();
const { sequelize, connectDatabase } = require("../config/database");
require("./models"); // register all models + associations

async function migrate() {
  try {
    await connectDatabase();

    // `alter: true` is intentionally NOT used here — on a live production
    // database it can silently rewrite column types/constraints and cause
    // data loss. This creates any tables that don't exist yet and leaves
    // existing tables untouched. For future schema changes, write a proper
    // migration (sequelize-cli) rather than relying on sync.
    await sequelize.sync();

    console.log("[MIGRATE] Schema is up to date.");
    process.exit(0);
  } catch (error) {
    console.error("[MIGRATE] Failed:", error);
    process.exit(1);
  }
}

migrate();