const jwt = require("jsonwebtoken");
const env = require("../../config/env");

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
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
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateImpersonationToken
};