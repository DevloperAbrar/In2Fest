const bcrypt = require("bcryptjs");
const { User } = require("../../database/models");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("./jwt.service");
const { AppError } = require("../../middleware/error.middleware");
const teamMemberService = require("../team-members/teamMember.service");

/**
 * Super Admin login  - email + password only (as per spec: no Google OAuth for admin)
 */
async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const user = await User.findOne({ where: { email, role: "super_admin" } });

    if (!user || !user.is_active) {
      throw new AppError("Invalid credentials", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    user.last_login_at = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Team member login  - email + password, separate identity from the venue
 * owner's Google account. Issues a JWT scoped to one venue + permissions.
 */
async function teamMemberLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await teamMemberService.loginTeamMember(email, password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * Called after successful Google OAuth (passport attaches req.user)
 */
async function googleCallback(req, res, next) {
  try {
    const user = req.user;
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    const env = require("../../config/env");
    res.redirect(`${env.clientUrl}/auth/callback?token=${accessToken}`);
  } catch (error) {
    next(error);
  }
}

async function refreshAccessToken(req, res, next) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) throw new AppError("No refresh token provided", 401);

    const decoded = verifyRefreshToken(token);
    const user = await User.findByPk(decoded.id);

    if (!user || !user.is_active) {
      throw new AppError("User not found or inactive", 401);
    }

    const accessToken = generateAccessToken(user);
    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    next(new AppError("Invalid or expired refresh token", 401));
  }
}

async function logout(req, res) {
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out successfully" });
}

async function getCurrentUser(req, res, next) {
  try {
    if (req.user.role === "team_member") {
      // req.user was already fully resolved from TeamMember in the
      // authenticate middleware  - just echo it back, no password hash.
      return res.json({ success: true, data: req.user });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "role", "last_login_at"]
    });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

module.exports = { adminLogin, teamMemberLogin, googleCallback, refreshAccessToken, logout, getCurrentUser };