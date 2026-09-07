require("dotenv").config();

const required = [
  "PORT",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "SESSION_SECRET",
  "SUPER_ADMIN_EMAIL",
  "SUPER_ADMIN_PASSWORD"
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `[ENV ERROR] Missing required environment variables: ${missing.join(", ")}`
  );
  process.exit(1);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,
  baseDomain: process.env.BASE_DOMAIN || "venuesafar.com",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d"
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL
  },

  session: {
    secret: process.env.SESSION_SECRET
  },

  superAdmin: {
    name: process.env.SUPER_ADMIN_NAME || "Super Admin",
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
  },

  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL,
    apiKey: process.env.WHATSAPP_API_KEY
  },

  upload: {
    dir: process.env.UPLOAD_DIR || "uploads",
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5
  },

  rateLimit: {
    windowMin: parseInt(process.env.RATE_LIMIT_WINDOW_MIN, 10) || 15,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 200
  }
};