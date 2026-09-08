const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const path = require("path");

const env = require("./config/env");
const passport = require("./modules/auth/google.strategy");
const { apiLimiter } = require("./middleware/rateLimiter.middleware");
const { errorHandler, notFoundHandler } = require("./middleware/error.middleware");
const { resolveSubdomain } = require("./subdomain/subdomain.middleware");
const routes = require("./routes/index");
const sitemapRoutes = require("./modules/seo/sitemap.routes");

const app = express();
app.set("trust proxy", 1);
// Security & performance
app.use(helmet({ crossOriginResourcePolicy: false }));
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
const razorpayWebhookRoutes = require("./modules/payments/razorpay.webhook");
app.use("/api/webhooks", razorpayWebhookRoutes); // must be before express.json() for raw-body HMAC
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

// Rate limiting for all API routes
app.use("/api", apiLimiter);

// Health check
app.get("/health", (req, res) => {
  res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

// Main API routes
app.use("/api", routes);

// 404 + error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;