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

module.exports = { generateAccessToken, generateRefreshToken, verifyRefreshToken };