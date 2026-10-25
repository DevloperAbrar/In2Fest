const jwt = require("jsonwebtoken");
const env = require("../../config/env");

const REFRESH_COOKIE = "refreshToken";
const DEFAULT_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

// Same payload the team-member login already uses, so the refreshed token is
// identical to the one issued at login.
function generateTeamMemberAccessToken(teamMember) {
  return jwt.sign(
    { id: teamMember.id, role: "team_member" },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

// `extra` is only used for team members ({ role: "team_member" }) so the refresh
// endpoint knows which table to look the person up in. Owner / admin refresh
// tokens (and every refresh token already issued) have no role claim and keep
// working exactly as before.
function generateRefreshToken(user, extra = {}) {
  return jwt.sign(
    { id: user.id, ...extra },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

// "30d" / "12h" / "15m" / "45s" / "2w" -> milliseconds. Anything else -> 30 days.
function durationToMs(value, fallbackMs) {
  const m = /^(\d+)\s*([smhdw])$/i.exec(String(value || "").trim());
  if (!m) return fallbackMs;
  const unit = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 }[m[2].toLowerCase()];
  return parseInt(m[1], 10) * unit;
}

// One place that decides how the refresh cookie is stored, so login, refresh
// and logout can never disagree. The cookie lives as long as the refresh token.
// COOKIE_SAMESITE (lax | strict | none) is optional; default is "lax".
function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  let sameSite = String(process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  if (!["lax", "strict", "none"].includes(sameSite)) sameSite = "lax";
  return {
    httpOnly: true,
    secure: isProd || sameSite === "none",
    sameSite,
    path: "/",
    maxAge: durationToMs(env.jwt.refreshExpiresIn, DEFAULT_REFRESH_MS)
  };
}

function clearRefreshCookieOptions() {
  const { maxAge: _maxAge, ...rest } = refreshCookieOptions();
  return rest;
}

/**
 * Short-lived token used by super_admin to "log in as" a vendor
 * (venue owner) without ever knowing/using the vendor's credentials.
 * Carries an `impersonated_by` claim so every request made with it can be
 * traced back to the admin who opened the session, and expires quickly so a
 * leaked/old link can't be replayed as a standing login.
 */
function generateImpersonationToken(user, adminId) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, impersonated_by: adminId },
    env.jwt.secret,
    { expiresIn: "1h" }
  );
}

module.exports = {
  REFRESH_COOKIE,
  generateAccessToken,
  generateTeamMemberAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  refreshCookieOptions,
  clearRefreshCookieOptions,
  generateImpersonationToken
};