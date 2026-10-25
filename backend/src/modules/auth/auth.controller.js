const bcrypt = require("bcryptjs");
const { User, TeamMember } = require("../../database/models");
const {
  REFRESH_COOKIE,
  generateAccessToken,
  generateTeamMemberAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  refreshCookieOptions,
  clearRefreshCookieOptions
} = require("./jwt.service");
const { AppError } = require("../../middleware/error.middleware");
const teamMemberService = require("../team-members/teamMember.service");
const { recordLogin } = require("../../utils/loginTracker");

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
    recordLogin({ actorType: "super_admin", actorId: user.id });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());

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
 * Also sets a refresh cookie so the staff member stays signed in like owners do.
 */
async function teamMemberLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await teamMemberService.loginTeamMember(email, password);
    recordLogin({ actorType: "team_member", actorId: result.user.id, venueId: result.user.venueId });

    const refreshToken = generateRefreshToken({ id: result.user.id }, { role: "team_member" });
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());

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
    recordLogin({ actorType: "vendor", actorId: user.id });
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const env = require("../../config/env");
    const clientUrl = env.clientUrl || "http://localhost:5173";

    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());

    const token = encodeURIComponent(accessToken);
    const redirectUrl = `${clientUrl}/auth/callback?token=${token}`;

    res.send(`<!DOCTYPE html>
<html>
<head><title>Signing in...</title></head>
<body>
<script>
  if (window.opener && !window.opener.closed) {
    window.opener.location.href = "${redirectUrl}";
    window.close();
  } else {
    window.location.href = "${redirectUrl}";
  }
</script>
<p>Signing in, please wait...</p>
</body>
</html>`);
  } catch (error) {
    next(error);
  }
}

/**
 * Exchanges the refresh cookie for a new access token.
 *  - 401 only when the cookie is missing / invalid / expired / the account is gone.
 *    The app logs the person out ONLY on this answer.
 *  - Any other failure (database hiccup, etc.) is a 5xx, so the app keeps the
 *    person signed in and simply tries again later.
 *  - Every successful refresh also renews the cookie (sliding session): someone
 *    who uses the app at least once in 30 days is never asked to sign in again.
 */
async function refreshAccessToken(req, res, next) {
  try {
    const token = req.cookies && req.cookies[REFRESH_COOKIE];
    if (!token) throw new AppError("No refresh token provided", 401);

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    let accessToken;
    let renewedRefresh;

    if (decoded.role === "team_member") {
      const member = await TeamMember.findByPk(decoded.id);
      if (!member || !member.is_active) {
        throw new AppError("User not found or inactive", 401);
      }
      accessToken = generateTeamMemberAccessToken(member);
      renewedRefresh = generateRefreshToken({ id: member.id }, { role: "team_member" });
    } else {
      const user = await User.findByPk(decoded.id);
      if (!user || !user.is_active) {
        throw new AppError("User not found or inactive", 401);
      }
      accessToken = generateAccessToken(user);
      renewedRefresh = generateRefreshToken(user);
    }

    res.cookie(REFRESH_COOKIE, renewedRefresh, refreshCookieOptions());
    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res) {
  res.clearCookie(REFRESH_COOKIE, clearRefreshCookieOptions());
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