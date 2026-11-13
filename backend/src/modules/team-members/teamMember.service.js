const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const { TeamMember, Venue } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { PLAN_FEATURES } = require("../../config/planFeatures");
const { assignableKeysForVenue } = require("../../config/teamPermissions");
const demoRegistry = require("../demo/demo.registry");

const DEFAULT_PERMISSIONS = PLAN_FEATURES.reduce((acc, f) => {
  acc[f.key] = false;
  return acc;
}, {});

const { SCOPES, FEATURE_LABELS, scopeKeysFor } = require("../../config/teamPermissions");

function generateTeamMemberToken(teamMember) {
  return jwt.sign(
    { id: teamMember.id, role: "team_member" },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

/**
 * Builds the permissions object to store.
 * - Only keys that fit this venue's business type can be turned on.
 * - Any key that does not fit (for example "food" on a gym) is forced to false.
 * - `scopes` (task-level limits per module) are kept only for modules that are allowed AND
 *   turned on. Omit a module from `scopes` or send null to give full access to that module.
 */
async function scopePermissions(venueId, incoming, current = {}) {
  const venue = await Venue.findByPk(venueId, {
    attributes: ["id", "business_category", "secondary_categories"]
  });
  if (!venue) throw new AppError("Venue not found", 404);

  const allowed = new Set(assignableKeysForVenue(venue));
  const { scopes: currentScopes, ...currentFlags } = current || {};
  const { scopes: incomingScopes, ...incomingFlags } = incoming || {};
  const merged = { ...DEFAULT_PERMISSIONS, ...currentFlags };

  Object.keys(incomingFlags).forEach((key) => {
    if (allowed.has(key)) merged[key] = incomingFlags[key] === true;
  });
  Object.keys(merged).forEach((key) => {
    if (!allowed.has(key)) merged[key] = false;
  });

  const nextScopes = { ...(currentScopes && typeof currentScopes === "object" ? currentScopes : {}) };
  const requested = incomingScopes && typeof incomingScopes === "object" ? incomingScopes : {};
  Object.keys(SCOPES).forEach((moduleKey) => {
    if (Object.prototype.hasOwnProperty.call(requested, moduleKey)) {
      const value = requested[moduleKey];
      if (Array.isArray(value)) {
        const valid = scopeKeysFor(moduleKey);
        nextScopes[moduleKey] = [...new Set(value.filter((k) => valid.includes(k)))];
      } else {
        delete nextScopes[moduleKey];
      }
    }
    if (!allowed.has(moduleKey) || merged[moduleKey] !== true) delete nextScopes[moduleKey];
  });
  if (Object.keys(nextScopes).length) merged.scopes = nextScopes;

  return merged;
}

// What the "Add team member" form may show for this venue (follows its category functionality).
async function getAssignableOptions(venueId) {
  const venue = await Venue.findByPk(venueId, {
    attributes: ["id", "business_category", "secondary_categories"]
  });
  if (!venue) throw new AppError("Venue not found", 404);

  const labels = PLAN_FEATURES.reduce((acc, f) => ({ ...acc, [f.key]: f.label }), { ...FEATURE_LABELS });
  const keys = assignableKeysForVenue(venue);

  return {
    modules: keys.map((key) => ({ key, label: labels[key] || key })),
    scopes: keys.filter((k) => SCOPES[k]).reduce((acc, k) => ({ ...acc, [k]: SCOPES[k].options }), {})
  };
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
  const scoped = await scopePermissions(venueId, permissions);

  const teamMember = await TeamMember.create({
    venue_id: venueId,
    name,
    email,
    password_hash,
    permissions: scoped
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
    teamMember.permissions = await scopePermissions(venueId, updates.permissions, teamMember.permissions || {});
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

  // Demo accounts: blocked once expired/revoked. Normal venues -> demo is null, nothing changes.
  const demo = await demoRegistry.get(venue.id);
  if (demo && !demoRegistry.isLive(demo)) {
    throw new AppError("This demo has ended. Please contact In2Fest to continue.", 403);
  }
  if (demo) demoRegistry.recordLogin(venue.id);

  const accessToken = generateTeamMemberToken(teamMember);
  const { password_hash: _omit, ...safe } = teamMember.toJSON();

  return {
    accessToken,
    user: {
      ...safe,
      role: "team_member",
      venueId: teamMember.venue_id,
      ...(demo ? { isDemo: true, demoExpiresAt: demo.expires_at } : {})
    },
    venue: { id: venue.id, hall_name: venue.hall_name }
  };
}

module.exports = {
  DEFAULT_PERMISSIONS,
  createTeamMember,
  listTeamMembers,
  updateTeamMember,
  deleteTeamMember,
  loginTeamMember,
  getAssignableOptions
};