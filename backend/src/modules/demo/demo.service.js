const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { QueryTypes } = require("sequelize");
const { sequelize, Venue, User, Plan, Subscription, TeamMember } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { PLAN_FEATURES } = require("../../config/planFeatures");
const env = require("../../config/env");
const registry = require("./demo.registry");
const { seedGymData } = require("./demo.seed");

const DOMAIN = process.env.DEMO_EMAIL_DOMAIN || "demo.in2fest.com";
const PLAN_NAME = "Gym Demo (internal)";
const OWNER_EMAIL = `demo-owner@${DOMAIN}`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 24 * 60 * 60 * 1000;

const q = (sql, replacements = {}, transaction) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction });
const exec = (sql, replacements = {}, transaction) => sequelize.query(sql, { replacements, transaction });

const rand = (n, alphabet) => Array.from({ length: n }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
const ALNUM = "abcdefghjkmnpqrstuvwxyz23456789";
const makePassword = () => `Demo@${rand(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")}`;
const slug = (s) => String(s || "gym").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "gym";
const loginUrl = () => `${String(env.clientUrl || "").replace(/\/$/, "")}/team-login`;

function present(r) {
  const expired = new Date(r.expires_at).getTime() <= Date.now();
  return { ...r, members: Number(r.members) || 0, state: r.status !== "active" ? r.status : expired ? "expired" : "active" };
}

async function getRow(id) {
  if (!UUID_RE.test(String(id))) throw new AppError("Invalid demo id", 400);
  const [row] = await q("SELECT * FROM demo_accounts WHERE id = :id", { id });
  if (!row) throw new AppError("Demo account not found", 404);
  return row;
}

async function getPresented(id) {
  const [row] = await q(
    `SELECT d.*, v.hall_name, v.subdomain,
       (SELECT COUNT(*) FROM gym_members m WHERE m.venue_id = d.venue_id AND m.is_archived = false) AS members
     FROM demo_accounts d LEFT JOIN venues v ON v.id = d.venue_id WHERE d.id = :id`,
    { id }
  );
  return row ? present(row) : null;
}

async function ensureOwner() {
  const [u] = await User.findOrCreate({
    where: { email: OWNER_EMAIL },
    defaults: { name: "In2Fest Demo Owner", role: "venue_owner", is_active: false } // inactive: nobody can ever sign in as it
  });
  return u;
}

async function ensurePlan() {
  const features = ["gym", "gym_pro"];
  let plan = await Plan.findOne({ where: { name: PLAN_NAME } });
  if (!plan) {
    plan = await Plan.create({
      name: PLAN_NAME,
      description: "Internal plan used by demo accounts. Not for sale.",
      monthly_price: 0,
      features,
      trial_days: 0,
      is_active: false
    });
  } else if (!features.every((f) => (plan.features || []).includes(f))) {
    await plan.update({ features });
  }
  return plan;
}

async function uniqueEmail(gymName) {
  for (let i = 0; i < 6; i += 1) {
    const email = `demo.${slug(gymName)}${rand(4, ALNUM)}@${DOMAIN}`;
    if (!(await TeamMember.findOne({ where: { email } }))) return email;
  }
  throw new AppError("Could not generate a unique demo email, try again", 500);
}

async function uniqueSubdomain(gymName) {
  for (let i = 0; i < 6; i += 1) {
    const sub = `demo-${slug(gymName)}-${rand(5, ALNUM)}`;
    if (!(await Venue.findOne({ where: { subdomain: sub }, attributes: ["id"] }))) return sub;
  }
  throw new AppError("Could not generate a unique subdomain, try again", 500);
}

async function purgeGymData(venueId) {
  const tables = await q(
    `SELECT DISTINCT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'venue_id' AND left(table_name, 4) = 'gym_'`
  );
  await sequelize.transaction(async (t) => {
    for (const { table_name } of tables) {
      await exec(`DELETE FROM "${table_name}" WHERE venue_id = :v`, { v: venueId }, t);
    }
  });
}

async function createDemo(input = {}, adminUser = null) {
  const prospectName = String(input.prospect_name || "").trim().slice(0, 120);
  if (!prospectName) throw new AppError("Prospect name is required", 400);
  const gymName = String(input.gym_name || "").trim().slice(0, 150) || `${prospectName} Fitness`;
  const days = Math.min(Math.max(parseInt(input.days, 10) || 7, 1), 30);
  const phone = String(input.prospect_phone || "").replace(/\D/g, "").slice(-10) || null;
  const password = input.password ? String(input.password) : makePassword();
  if (password.length < 6) throw new AppError("Password must be at least 6 characters", 400);

  const owner = await ensureOwner();
  const plan = await ensurePlan();
  const email = await uniqueEmail(gymName);
  const subdomain = await uniqueSubdomain(gymName);
  const expiresAt = new Date(Date.now() + days * DAY);
  const hash = await bcrypt.hash(password, 10);
  const demoId = crypto.randomUUID();

  const permissions = PLAN_FEATURES.reduce((acc, f) => ({ ...acc, [f.key]: false }), {});
  permissions.gym = true; // the ONLY thing a demo user can use

  let venue;
  await sequelize.transaction(async (t) => {
    venue = await Venue.create(
      {
        owner_id: owner.id,
        hall_name: gymName,
        subdomain,
        owner_name: prospectName,
        phone: null,
        city: String(input.city || "").trim().slice(0, 80) || "Bhopal",
        business_category: "gym-fitness",
        is_active: true,
        is_live: false,
        marketplace_listed: false
      },
      { transaction: t }
    );
    await Subscription.create(
      {
        venue_id: venue.id,
        plan_id: plan.id,
        locked_price: 0,
        billing_cycle: "monthly",
        status: "active",
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 730 * DAY) // demo expiry is enforced by demo_accounts.expires_at, not by billing
      },
      { transaction: t }
    );
    const member = await TeamMember.create(
      { venue_id: venue.id, name: "Demo Manager", email, password_hash: hash, permissions, is_active: true },
      { transaction: t }
    );
    await exec(
      `INSERT INTO demo_accounts
         (id, venue_id, team_member_id, login_email, prospect_name, prospect_phone, gym_name, notes, status, expires_at, created_by)
       VALUES (:id, :venue, :tm, :email, :pn, :pp, :gn, :notes, 'active', :exp, :by)`,
      {
        id: demoId,
        venue: venue.id,
        tm: member.id,
        email,
        pn: prospectName,
        pp: phone,
        gn: gymName,
        notes: input.notes ? String(input.notes).slice(0, 1000) : null,
        exp: expiresAt,
        by: adminUser && adminUser.id ? adminUser.id : null
      },
      t
    );
  });

  registry.set(venue.id, { status: "active", expires_at: expiresAt });

  let seeded = null;
  let seedError = null;
  try {
    seeded = await seedGymData(venue);
  } catch (e) {
    seedError = e.message;
    console.error("[DEMO] seeding failed:", e.message);
  }

  return {
    demo: await getPresented(demoId),
    credentials: { email, password, login_url: loginUrl(), valid_till: expiresAt },
    seeded,
    seed_error: seedError
  };
}

async function listDemos() {
  const rows = await q(
    `SELECT d.*, v.hall_name, v.subdomain,
       (SELECT COUNT(*) FROM gym_members m WHERE m.venue_id = d.venue_id AND m.is_archived = false) AS members
     FROM demo_accounts d LEFT JOIN venues v ON v.id = d.venue_id
     ORDER BY d.created_at DESC`
  );
  return rows.map(present);
}

async function resetDemo(id) {
  const row = await getRow(id);
  const venue = await Venue.findByPk(row.venue_id);
  if (!venue) throw new AppError("Demo venue not found", 404);
  await purgeGymData(row.venue_id);
  const seeded = await seedGymData(venue);
  await exec("UPDATE demo_accounts SET reset_count = reset_count + 1, last_reset_at = now(), updated_at = now() WHERE id = :id", { id });
  return { demo: await getPresented(id), seeded };
}

async function extendDemo(id, days) {
  const row = await getRow(id);
  const add = Math.min(Math.max(parseInt(days, 10) || 7, 1), 30);
  const exp = new Date(Math.max(new Date(row.expires_at).getTime(), Date.now()) + add * DAY);
  await exec("UPDATE demo_accounts SET expires_at = :e, status = 'active', updated_at = now() WHERE id = :id", { e: exp, id });
  await exec("UPDATE team_members SET is_active = true WHERE id = :t", { t: row.team_member_id });
  registry.set(row.venue_id, { status: "active", expires_at: exp });
  return { demo: await getPresented(id) };
}

async function revokeDemo(id) {
  const row = await getRow(id);
  await exec("UPDATE demo_accounts SET status = 'revoked', updated_at = now() WHERE id = :id", { id });
  await exec("UPDATE team_members SET is_active = false WHERE id = :t", { t: row.team_member_id });
  registry.set(row.venue_id, { status: "revoked", expires_at: row.expires_at });
  return { demo: await getPresented(id) };
}

async function regeneratePassword(id, custom) {
  const row = await getRow(id);
  const password = custom ? String(custom) : makePassword();
  if (password.length < 6) throw new AppError("Password must be at least 6 characters", 400);
  await exec("UPDATE team_members SET password_hash = :h WHERE id = :t", { h: await bcrypt.hash(password, 10), t: row.team_member_id });
  return { credentials: { email: row.login_email, password, login_url: loginUrl(), valid_till: row.expires_at } };
}

async function deleteDemo(id) {
  const row = await getRow(id);
  await purgeGymData(row.venue_id);
  for (const tbl of ["login_events", "whatsapp_messages"]) {
    try {
      await exec(`DELETE FROM ${tbl} WHERE venue_id = :v`, { v: row.venue_id });
    } catch (e) {
      console.error(`[DEMO] cleanup of ${tbl} skipped:`, e.message);
    }
  }
  await TeamMember.destroy({ where: { venue_id: row.venue_id } });
  await Subscription.destroy({ where: { venue_id: row.venue_id } });
  await Venue.destroy({ where: { id: row.venue_id } });
  await exec("DELETE FROM demo_accounts WHERE id = :id", { id });
  registry.remove(row.venue_id);
  return { deleted: true };
}

// Hourly: switch off expired logins, and delete demos that ended long ago.
async function cleanupExpired() {
  await exec(
    `UPDATE team_members SET is_active = false
      WHERE is_active = true
        AND id IN (SELECT team_member_id FROM demo_accounts WHERE status <> 'active' OR expires_at <= now())`
  );
  const keep = Math.max(parseInt(process.env.DEMO_RETENTION_DAYS, 10) || 30, 1);
  const old = await q(
    `SELECT id FROM demo_accounts
      WHERE expires_at < now() - (CAST(:d AS integer) * interval '1 day')
         OR (status = 'revoked' AND updated_at < now() - (CAST(:d AS integer) * interval '1 day'))`,
    { d: keep }
  );
  for (const r of old) {
    try {
      await deleteDemo(r.id);
    } catch (e) {
      console.error("[DEMO] auto-delete failed:", r.id, e.message);
    }
  }
  registry.warm();
}

module.exports = { createDemo, listDemos, resetDemo, extendDemo, revokeDemo, regeneratePassword, deleteDemo, cleanupExpired };