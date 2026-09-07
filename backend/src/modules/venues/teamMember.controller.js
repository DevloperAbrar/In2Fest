const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { TeamMember, Venue } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const env = require("../../config/env");

// GET /api/venues/:venueId/team-members
async function listTeamMembers(req, res, next) {
  try {
    const { venueId } = req.params;

    // Make sure the venue belongs to the requesting owner
    const venue = await Venue.findOne({ where: { id: venueId, owner_id: req.user.id } });
    if (!venue) throw new AppError("Venue not found", 404);

    const members = await TeamMember.findAll({
      where: { venue_id: venueId },
      attributes: ["id", "name", "email", "permissions", "is_active", "createdAt"],
      order: [["createdAt", "ASC"]],
    });

    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
}

// POST /api/venues/:venueId/team-members
async function addTeamMember(req, res, next) {
  try {
    const { venueId } = req.params;
    const { name, email, password, permissions } = req.body;

    if (!name || !email || !password) {
      throw new AppError("Name, email and password are required", 400);
    }

    const venue = await Venue.findOne({ where: { id: venueId, owner_id: req.user.id } });
    if (!venue) throw new AppError("Venue not found", 404);

    const existing = await TeamMember.findOne({ where: { venue_id: venueId, email } });
    if (existing) throw new AppError("A team member with this email already exists", 409);

    const password_hash = await bcrypt.hash(password, 12);

    const defaultPermissions = {
      bookings: true,
      payments: false,
      website: false,
      billingSettings: false,
      inquiries: true,
      clients: true,
      slots: false,
      reviews: false,
    };

    const member = await TeamMember.create({
      venue_id: venueId,
      name,
      email,
      password_hash,
      permissions: permissions || defaultPermissions,
    });

    res.status(201).json({
      success: true,
      data: {
        id: member.id,
        name: member.name,
        email: member.email,
        permissions: member.permissions,
        is_active: member.is_active,
      },
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/venues/:venueId/team-members/:memberId
async function updateTeamMember(req, res, next) {
  try {
    const { venueId, memberId } = req.params;
    const { permissions, is_active, name } = req.body;

    const venue = await Venue.findOne({ where: { id: venueId, owner_id: req.user.id } });
    if (!venue) throw new AppError("Venue not found", 404);

    const member = await TeamMember.findOne({ where: { id: memberId, venue_id: venueId } });
    if (!member) throw new AppError("Team member not found", 404);

    if (permissions !== undefined) member.permissions = permissions;
    if (is_active !== undefined) member.is_active = is_active;
    if (name !== undefined) member.name = name;

    await member.save();

    res.json({
      success: true,
      data: {
        id: member.id,
        name: member.name,
        email: member.email,
        permissions: member.permissions,
        is_active: member.is_active,
      },
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/venues/:venueId/team-members/:memberId
async function deleteTeamMember(req, res, next) {
  try {
    const { venueId, memberId } = req.params;

    const venue = await Venue.findOne({ where: { id: venueId, owner_id: req.user.id } });
    if (!venue) throw new AppError("Venue not found", 404);

    const member = await TeamMember.findOne({ where: { id: memberId, venue_id: venueId } });
    if (!member) throw new AppError("Team member not found", 404);

    await member.destroy();
    res.json({ success: true, message: "Team member removed" });
  } catch (error) {
    next(error);
  }
}

// POST /api/venues/team-member/login
async function teamMemberLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) throw new AppError("Email and password are required", 400);

    const member = await TeamMember.findOne({ where: { email } });
    if (!member || !member.is_active) throw new AppError("Invalid credentials", 401);

    const isMatch = await bcrypt.compare(password, member.password_hash);
    if (!isMatch) throw new AppError("Invalid credentials", 401);

    // Issue a JWT that clearly marks this as a team_member token
    const accessToken = jwt.sign(
      {
        id: member.id,
        role: "team_member",
        venue_id: member.venue_id,
        email: member.email,
        permissions: member.permissions,
      },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          venue_id: member.venue_id,
          permissions: member.permissions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTeamMembers,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  teamMemberLogin,
};