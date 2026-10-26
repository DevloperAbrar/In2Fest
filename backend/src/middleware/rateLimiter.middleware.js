const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const { ipKeyGenerator } = rateLimit;

/**
 * General API limiter.
 *
 * The old limiter counted every request per IP (200 per 15 min). Dashboards poll
 * (food orders every 5s, orders every 15s) and a whole restaurant or office often
 * shares one WiFi IP, so real vendors were getting "Too many requests".
 *
 * Now:
 *  - a logged-in person is counted per account (not per IP), with a high limit
 *  - anonymous visitors are counted per IP with a limit that fits shared WiFi
 *  - health checks and CORS preflights are never counted
 * Abuse protection stays in place through the stricter limiters below
 * (login, OTP, public forms), which are unchanged.
 *
 * Tuning (optional, in .env):
 *   API_RATE_LIMIT_AUTH_MAX  per logged-in account per window  (default 5000)
 *   API_RATE_LIMIT_ANON_MAX  per IP for visitors per window    (default 3000)
 *   RATE_LIMIT_WINDOW_MIN    window length in minutes          (default 15)
 */
const AUTH_MAX = parseInt(process.env.API_RATE_LIMIT_AUTH_MAX, 10) || 5000;
const ANON_MAX = parseInt(process.env.API_RATE_LIMIT_ANON_MAX, 10) || 3000;

function identify(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(header.slice(7), env.jwt.secret);
    if (decoded && decoded.id) return `${decoded.type === "public_user" ? "p" : "u"}:${decoded.id}`;
  } catch (_) {
    /* invalid or expired token: counted as anonymous */
  }
  return null;
}

const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMin * 60 * 1000,
  limit: (req) => (req.rateLimitIdentity ? AUTH_MAX : ANON_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS" || req.path === "/health",
  keyGenerator: (req) => {
    req.rateLimitIdentity = identify(req);
    return req.rateLimitIdentity || `ip:${ipKeyGenerator(req.ip)}`;
  },
  message: {
    success: false,
    message: "Too many requests. Please wait a moment and try again."
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later."
  }
});

const publicInquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many inquiries submitted. Please try again later."
  }
});

const cityRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

module.exports = { apiLimiter, authLimiter, publicInquiryLimiter, cityRequestLimiter };