const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { getRedisClient } = require("../config/redis");

// Fallback store, used only when Redis isn't configured (e.g. local dev).
// In production, set REDIS_URL so OTPs survive restarts/deploys.
const otpStore = new Map();

async function generateOtp(phone) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const redis = await getRedisClient();

  if (redis) {
    await redis.set(`otp:${phone}`, otp, { EX: 5 * 60 });
  } else {
    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
  }

  return otp;
}

async function verifyOtp(phone, otp) {
  const redis = await getRedisClient();

  if (redis) {
    const stored = await redis.get(`otp:${phone}`);
    if (!stored || stored !== otp) return false;
    await redis.del(`otp:${phone}`);
    return true;
  }

  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  if (entry.otp !== otp) return false;
  otpStore.delete(phone);
  return true;
}

// Short-lived proof-of-verification token, issued after a successful verifyOtp call.
function issueVerificationToken(phone) {
  return jwt.sign({ phone, purpose: "otp_verified" }, env.jwt.secret, { expiresIn: "15m" });
}

function verifyVerificationToken(token, phone) {
  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    return decoded.purpose === "otp_verified" && decoded.phone === phone;
  } catch {
    return false;
  }
}

module.exports = { generateOtp, verifyOtp, issueVerificationToken, verifyVerificationToken };