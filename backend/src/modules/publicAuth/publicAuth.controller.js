const { PublicUser, Review } = require("../../database/models");
const { verifyGoogleIdToken } = require("../../utils/googleIdToken");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("./publicJwt.service");
const { AppError } = require("../../middleware/error.middleware");

const REFRESH_COOKIE = "publicRefreshToken"; // deliberately different name from the vendor's "refreshToken" cookie

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

/**
 * Sign in (or silently register) a site visitor with their Google account.
 * Replaces the old "verify once and discard" flow on the review form with a
 * real, persistent session  - so visitors stay signed in across the site.
 */
async function googleLogin(req, res, next) {
  try {
    const { credential } = req.body;
    const { email, name, sub, picture } = await verifyGoogleIdToken(credential);

    let user = await PublicUser.findOne({ where: { google_id: sub } });
    if (!user) {
      user = await PublicUser.findOne({ where: { email } });
    }

    if (!user) {
      user = await PublicUser.create({ name, email, google_id: sub, avatar_url: picture });
    } else if (!user.google_id) {
      user.google_id = sub;
      if (picture) user.avatar_url = picture;
      await user.save();
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      data: {
        accessToken,
        user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url }
      }
    });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) throw new AppError("No refresh token provided", 401);

    const decoded = verifyRefreshToken(token);
    const user = await PublicUser.findByPk(decoded.id);
    if (!user) throw new AppError("User not found", 401);

    const accessToken = generateAccessToken(user);
    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    next(new AppError("Invalid or expired session", 401));
  }
}

async function logout(req, res) {
  res.clearCookie(REFRESH_COOKIE);
  res.json({ success: true, message: "Logged out" });
}

async function me(req, res, next) {
  try {
    const reviewCount = await Review.count({
      where: { reviewer_user_id: req.publicUser.id, reviewer_role: "visitor" }
    });
    res.json({
      success: true,
      data: {
        id: req.publicUser.id,
        name: req.publicUser.name,
        email: req.publicUser.email,
        avatar_url: req.publicUser.avatar_url,
        review_count: reviewCount
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { googleLogin, refresh, logout, me };