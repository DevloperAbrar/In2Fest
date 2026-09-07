const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const { TeamMember, Venue } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { PLAN_FEATURES } = require("../../config/planFeatures");

const DEFAULT_PERMISSIONS = PLAN_FEATURES.reduce((acc, f) => {
  acc[f.key] = false;
  return acc;
}, {});

function generateTeamMemberToken(teamMember) {
  return jwt.sign(
    { id: teamMember.id, role: "team_member" },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

async function createTeamMember(venueId, { name, email, password, permissions }) {
  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required", 400);
  }
  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const existing = await TeamMember.findOne({ where: { email } });
  if (existing) {
    throw new AppError("A team member with this email already exists", 400);
  }

  const password_hash = await bcrypt.hash(password, 10);

  const teamMember = await TeamMember.create({
    venue_id: venueId,
    name,
    email,
    password_hash,
    permissions: { ...DEFAULT_PERMISSIONS, ...(permissions || {}) }
  });

  const { password_hash: _omit, ...safe } = teamMember.toJSON();
  return safe;
}

async function listTeamMembers(venueId) {
  const members = await TeamMember.findAll({
    where: { venue_id: venueId },
    attributes: { exclude: ["password_hash"] },
    order: [["createdAt", "DESC"]]
  });
  return members;
}

async function updateTeamMember(venueId, teamMemberId, updates) {
  const teamMember = await TeamMember.findOne({ where: { id: teamMemberId, venue_id: venueId } });
  if (!teamMember) throw new AppError("Team member not found", 404);

  if (updates.name !== undefined) teamMember.name = updates.name;
  if (updates.is_active !== undefined) teamMember.is_active = updates.is_active;
  if (updates.permissions !== undefined) {
    teamMember.permissions = { ...teamMember.permissions, ...updates.permissions };
  }
  if (updates.password) {
    if (updates.password.length < 6) {
      throw new AppError("Password must be at least 6 characters", 400);
    }
    teamMember.password_hash = await bcrypt.hash(updates.password, 10);
  }

  await teamMember.save();
  const { password_hash: _omit, ...safe } = teamMember.toJSON();
  return safe;
}

async function deleteTeamMember(venueId, teamMemberId) {
  const teamMember = await TeamMember.findOne({ where: { id: teamMemberId, venue_id: venueId } });
  if (!teamMember) throw new AppError("Team member not found", 404);
  await teamMember.destroy();
}

async function loginTeamMember(email, password) {
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const teamMember = await TeamMember.findOne({ where: { email } });
  if (!teamMember || !teamMember.is_active) {
    throw new AppError("Invalid credentials", 401);
  }

  const isMatch = await bcrypt.compare(password, teamMember.password_hash);
  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  const venue = await Venue.findByPk(teamMember.venue_id);
  if (!venue || !venue.is_active) {
    throw new AppError("This venue has been deactivated. Please contact support.", 403);
  }

  const accessToken = generateTeamMemberToken(teamMember);
  const { password_hash: _omit, ...safe } = teamMember.toJSON();

  return {
    accessToken,
    user: { ...safe, role: "team_member", venueId: teamMember.venue_id },
    venue: { id: venue.id, hall_name: venue.hall_name }
  };
}

module.exports = {
  DEFAULT_PERMISSIONS,
  createTeamMember,
  listTeamMembers,
  updateTeamMember,
  deleteTeamMember,
  loginTeamMember
};