const jwt = require("jsonwebtoken");
const env = require("../../config/env");

function generateAccessToken(publicUser) {
  return jwt.sign(
    { id: publicUser.id, email: publicUser.email, name: publicUser.name, type: "public_user" },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

function generateRefreshToken(publicUser) {
  return jwt.sign(
    { id: publicUser.id, type: "public_user" },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
}

function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, env.jwt.refreshSecret);
  if (decoded.type !== "public_user") {
    const err = new Error("Invalid refresh token");
    err.statusCode = 401;
    throw err;
  }
  return decoded;
}

module.exports = { generateAccessToken, generateRefreshToken, verifyRefreshToken };