const bcrypt = require("bcryptjs");
const { User } = require("../models");
const env = require("../../config/env");

/**
 * Creates the Super Admin account from .env credentials on first run.
 * Safe to run multiple times  - skips if already exists.
 */
async function seedSuperAdmin() {
  const existing = await User.findOne({ where: { email: env.superAdmin.email } });

  if (existing) {
    console.log("[SEED] Super Admin already exists, skipping.");
    return existing;
  }

  const passwordHash = await bcrypt.hash(env.superAdmin.password, 12);

  const admin = await User.create({
    name: env.superAdmin.name,
    email: env.superAdmin.email,
    password_hash: passwordHash,
    role: "super_admin",
    is_active: true
  });

  console.log(`[SEED] Super Admin created: ${admin.email}`);
  return admin;
}

module.exports = { seedSuperAdmin };