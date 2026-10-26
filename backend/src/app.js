const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const path = require("path");

const env = require("./config/env");
const { sequelize } = require("./config/database");
const passport = require("./modules/auth/google.strategy");
const { apiLimiter } = require("./middleware/rateLimiter.middleware");
const { errorHandler, notFoundHandler } = require("./middleware/error.middleware");
const { resolveSubdomain } = require("./subdomain/subdomain.middleware");
const { metricsMiddleware } = require("./utils/metrics");
const routes = require("./routes/index");
const sitemapRoutes = require("./modules/seo/sitemap.routes");

const app = express();

// Number of reverse proxies in front of the app (nginx = 1, Cloudflare + nginx = 2).
// Wrong value makes every visitor look like one IP. Set TRUST_PROXY_HOPS in .env if needed.
app.set("trust proxy", parseInt(process.env.TRUST_PROXY_HOPS, 10) || 1);

// Request metrics for the Super Admin "Database & System" page (memory only, no DB).
app.use(metricsMiddleware);

// Security & performance
app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth/google")) {
    return next(); // Google OAuth routes pe helmet skip
  }
  helmet({ crossOriginResourcePolicy: false })(req, res, next);
});
app.use(compression());


// CORS  - allow the main app plus any *.{baseDomain} subdomain
const allowedOrigin = new RegExp(`^https?://([a-zA-Z0-9-]+\\.)?${env.baseDomain.replace(".", "\\.")}$`);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.nodeEnv === "development" || allowedOrigin.test(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use("/", sitemapRoutes);
app.use("/api", sitemapRoutes); // makes https://in2fest.com/api/sitemap.xml work, since /api already reaches the backend
const cashfreeWebhookRoutes = require("./modules/payments/cashfree.webhook");
app.use("/api/webhooks", cashfreeWebhookRoutes); // must be before express.json() for raw-body HMAC
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

// Session required by passport (stateless JWT is used after login, this is just for the OAuth handshake)
app.use(
  session({
    secret: env.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: env.nodeEnv === "production", maxAge: 10 * 60 * 1000 }
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Static uploads
app.use("/uploads", express.static(path.join(process.cwd(), env.upload.dir)));

// Subdomain resolution (attaches req.venue for public site routes)
app.use(resolveSubdomain);

// Rate limiting for all API routes (per logged-in account, or per IP for visitors)
app.use("/api", apiLimiter);

// Health check: also proves the database answers, so uptime monitors see real problems.
app.get("/health", async (req, res) => {
  const timestamp = new Date().toISOString();
  let timer;
  try {
    await Promise.race([
      sequelize.query("SELECT 1"),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Database did not answer in time")), 3000);
      })
    ]);
    res.json({ success: true, status: "ok", db: "up", timestamp });
  } catch (error) {
    console.error("[HEALTH] Database check failed:", error.message);
    res.status(503).json({ success: false, status: "degraded", db: "down", timestamp });
  } finally {
    clearTimeout(timer);
  }
});

// Main API routes
app.use("/api", routes);

// 404 + error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;