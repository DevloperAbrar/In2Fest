const bcrypt = require("bcryptjs");
const { User } = require("./models");
const env = require("../config/env");

/**
 * Opt-in recovery: when SUPER_ADMIN_RESET=true is set in .env, this makes the
 * super admin account match SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD exactly.
 * It never touches non-admin accounts. Remove the flag after one successful login.
 */
async function syncSuperAdminFromEnv() {
  if (String(process.env.SUPER_ADMIN_RESET || "").toLowerCase() !== "true") return;

  const email = String(env.superAdmin.email || "").trim();
  const password = String(env.superAdmin.password || "");

  if (!email || !password) {
    console.error("[ADMIN] SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD missing, reset skipped.");
    return;
  }

  const existing = await User.findOne({ where: { email } });

  if (existing && existing.role !== "super_admin") {
    console.error(
      `[ADMIN] ${email} already belongs to a ${existing.role} account. Reset refused. Use a different SUPER_ADMIN_EMAIL.`
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    existing.password_hash = passwordHash;
    existing.is_active = true;
    await existing.save();
    console.log(`[ADMIN] Super Admin password reset from .env for ${email}`);
  } else {
    await User.create({
      name: env.superAdmin.name || "Super Admin",
      email,
      password_hash: passwordHash,
      role: "super_admin",
      is_active: true
    });
    console.log(`[ADMIN] Super Admin created from .env: ${email}`);
  }

  console.warn("[ADMIN] Login now, then REMOVE SUPER_ADMIN_RESET from .env.");
}

module.exports = { syncSuperAdminFromEnv };