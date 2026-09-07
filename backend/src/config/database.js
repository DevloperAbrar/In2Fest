const { Sequelize } = require("sequelize");
const env = require("./env");

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: "postgres",
  logging: env.nodeEnv === "development" ? console.log : false,
  dialectOptions: env.nodeEnv === "production"
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    underscored: true,
    timestamps: true
  }
});

async function connectDatabase() {
  try {
    await sequelize.authenticate();
    console.log("[DB] PostgreSQL connection established successfully.");
  } catch (error) {
    console.error("[DB] Unable to connect to the database:", error.message);
    process.exit(1);
  }
}

module.exports = { sequelize, connectDatabase };