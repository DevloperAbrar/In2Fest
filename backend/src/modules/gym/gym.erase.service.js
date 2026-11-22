// Permanent "erase my gym data" so a vendor can restart from zero.
//
// Safety rules:
//  - every DELETE is limited to ONE venue (venue_id = :v); table names come from the fixed list below,
//    never from user input
//  - all-or-nothing: one transaction, so a failure leaves the data untouched
//  - 3 server-side gates: (1) valid scopes, (2) identity check -> short-lived signed token,
//    (3) typed phrase + acknowledgement
//  - the token is single-use (checked against the erase log)
//  - Admin preview: the Super Admin's own identity is verified, and the admin id is logged
//  - Staff module tables (gym_staff*) are NOT touched
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { QueryTypes } = require("sequelize");
const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const env = require("../../config/env");
const { getR2Client } = require("../../config/r2");
const { sequelize, User } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

const CONFIRM_PHRASE = "DELETE ALL DATA";
const TOKEN_TTL_SEC = 10 * 60;
const SCOPE_ORDER = ["members", "store", "leads", "setup"];

const SCOPE_META = {
  members: { label: "Members & payments", description: "All members with their memberships, payments, receipts, attendance, shift links, workout plans and WhatsApp history. Member IDs and receipt numbers start again from 1." },
  store: { label: "Store", description: "All products, sizes/variants, categories, stock history and sales invoices. Invoice numbers start again from 1." },
  leads: { label: "Leads", description: "All enquiries and trial leads." },
  setup: { label: "Plans & setup (optional)", description: "Membership plans, shifts, workout templates, your own exercises and your message templates. Can only be erased together with Members." }
};

// Order matters: members -> store -> leads -> setup.
// where = extra filter (always combined with venue_id = :v). label null = not shown in the summary.
// photos = column holding an image URL that is removed from storage after the erase.
const STEPS = [
  { scope: "members", table: "gym_assessments", label: "Progress records" },
  { scope: "members", table: "gym_batch_members", label: null },
  { scope: "members", table: "gym_event_participants", label: null },
  { scope: "members", table: "gym_member_profiles", label: "Sport / class profiles" },
  { scope: "members", table: "gym_attendance", label: "Attendance records" },
  { scope: "members", table: "gym_member_shifts", label: null },
  { scope: "members", table: "gym_message_logs", label: "WhatsApp message history", where: " AND recipient_type = 'member'" },
  { scope: "members", table: "gym_workout_plans", label: "Member workout plans", where: " AND member_id IS NOT NULL" },
  { scope: "members", table: "gym_payments", label: "Payments & receipts" },
  { scope: "members", table: "gym_memberships", label: "Memberships" },
  { scope: "members", table: "gym_members", label: "Members", photos: "photo_url" },

  { scope: "store", table: "gym_stock_movements", label: "Stock history" },
  { scope: "store", table: "gym_sales", label: "Sales & invoices" },
  { scope: "store", table: "gym_product_variants", label: "Product sizes/variants" },
  { scope: "store", table: "gym_products", label: "Products", photos: "image_url" },
  { scope: "store", table: "gym_store_categories", label: "Store categories" },

  { scope: "leads", table: "gym_leads", label: "Leads" },
  { scope: "leads", table: "gym_message_logs", label: null, where: " AND recipient_type = 'lead'" },

  { scope: "setup", table: "gym_workout_plans", label: "Workout templates" },
  { scope: "setup", table: "gym_exercises", label: "Your custom exercises" }, // built-in exercises have venue_id NULL, never matched
  { scope: "setup", table: "gym_message_templates", label: "Your message templates" },
  { scope: "setup", table: "gym_shifts", label: "Shifts" },
  { scope: "setup", table: "gym_batches", label: "Batches / classes" },
  { scope: "setup", table: "gym_test_templates", label: "Your custom tests" },
  { scope: "setup", table: "gym_events", label: "Events" },
  { scope: "setup", table: "gym_drills", label: "Your drills" },
  { scope: "setup", table: "gym_plans", label: "Membership plans" }
];

const ALL_TABLES = [...new Set([...STEPS.map((s) => s.table), "gym_sales", "gym_leads"])];

const tokenSecret = () => `${env.jwt.secret}:gym-data-erase`;
const invalidToken = () => new AppError("Your confirmation expired. Please verify again.", 400, { code: "ERASE_TOKEN_INVALID" });

function normalizeScopes(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const scopes = SCOPE_ORDER.filter((k) => list.includes(k));
  if (!scopes.length) throw new AppError("Choose at least one thing to erase.", 400);
  if (scopes.includes("setup") && !scopes.includes("members")) {
    throw new AppError("Plans & setup can only be erased together with Members & payments.", 400);
  }
  return scopes;
}

let logReady = null;
function ensureLogTable() {
  if (!logReady) {
    logReady = (async () => {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS venue_data_erasures (
           id UUID PRIMARY KEY,
           venue_id UUID NOT NULL,
           module VARCHAR(20) NOT NULL DEFAULT 'gym',
           user_id UUID,
           user_email VARCHAR(255),
           scopes JSONB NOT NULL DEFAULT '[]',
           deleted JSONB NOT NULL DEFAULT '{}',
           created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
         )`
      );
      // Set when a Super Admin did the erase from Admin preview.
      await sequelize.query(`ALTER TABLE venue_data_erasures ADD COLUMN IF NOT EXISTS admin_id UUID`);
    })().catch((e) => { logReady = null; throw e; });
  }
  return logReady;
}

// NOTE: do not start this query with "SELECT table_name FROM information_schema.tables".
// Sequelize treats that exact text as a "show tables" query and returns arrays instead of objects.
async function existingTables(t) {
  const rows = await sequelize.query(
    `SELECT t.table_name AS name FROM information_schema.tables AS t
      WHERE t.table_schema = 'public' AND t.table_name IN (:names)`,
    { replacements: { names: ALL_TABLES }, type: QueryTypes.SELECT, transaction: t }
  );
  return new Set(rows.map((r) => (Array.isArray(r) ? r[0] : r.name)));
}

async function countRows(step, venueId, t) {
  const rows = await sequelize.query(
    `SELECT COUNT(*)::int AS n FROM ${step.table} WHERE venue_id = :v${step.where || ""}`,
    { replacements: { v: venueId }, type: QueryTypes.SELECT, transaction: t }
  );
  return Number(rows[0]?.n || 0);
}

function maskEmail(email) {
  const [name = "", domain = ""] = String(email || "").split("@");
  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

// Whose identity must be proven: the vendor normally, the Super Admin in Admin preview.
async function loadVerifier(userId, adminId) {
  if (!adminId) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError("Account not found.", 404);
    return user;
  }
  const admin = await User.findByPk(adminId);
  if (!admin || admin.role !== "super_admin" || admin.is_active === false) {
    throw new AppError("Admin account could not be verified.", 403);
  }
  return admin;
}

// Step 1: what exists and what would be erased.
async function summary(venueId, userId, adminId = null) {
  const tables = await existingTables();
  const scopes = {};
  for (const key of SCOPE_ORDER) scopes[key] = { ...SCOPE_META[key], items: [], total: 0 };

  for (const step of STEPS) {
    if (!tables.has(step.table)) continue;
    const n = await countRows(step, venueId);
    const bucket = scopes[step.scope];
    if (step.label) {
      const found = bucket.items.find((i) => i.label === step.label);
      if (found) found.count += n; else bucket.items.push({ label: step.label, count: n });
    }
    bucket.total += n;
  }

  const verifier = await loadVerifier(userId, adminId);
  return {
    scopes,
    needs_password: !!verifier.password_hash,
    email_hint: maskEmail(verifier.email),
    acting_as_admin: !!adminId,
    phrase: CONFIRM_PHRASE
  };
}

// Step 2: prove identity, then hand out a short-lived token bound to this venue + scopes.
async function verifyIdentity({ venue, userId, adminId = null, scopes: rawScopes, password, email }) {
  const scopes = normalizeScopes(rawScopes);
  const verifier = await loadVerifier(userId, adminId);

  if (verifier.password_hash) {
    const ok = password ? await bcrypt.compare(String(password), verifier.password_hash) : false;
    if (!ok) throw new AppError("Incorrect password.", 400); // 400 on purpose: a 401 would log the person out
  } else if (String(email || "").trim().toLowerCase() !== String(verifier.email).toLowerCase()) {
    throw new AppError("That email does not match the account email.", 400);
  }

  const token = jwt.sign(
    { purpose: "gym_data_erase", uid: userId, aid: adminId || null, vid: venue.id, scopes },
    tokenSecret(),
    { expiresIn: TOKEN_TTL_SEC }
  );
  return { token, expires_in: TOKEN_TTL_SEC };
}

// Removes erased images from storage. Best effort: never fails the erase.
async function removeFiles(venueId, urls) {
  try {
    const base = String(process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
    const bucket = process.env.R2_BUCKET_NAME;
    const client = getR2Client();
    if (!base || !bucket || !client) return;
    const keys = [...new Set(urls)]
      .filter((u) => typeof u === "string" && u.startsWith(`${base}/`))
      .map((u) => u.slice(base.length + 1))
      .filter((k) => !k.includes("..") && (
        (k.startsWith(`gym/${venueId}/`) && !k.startsWith(`gym/${venueId}/logo/`)) || k.startsWith(`gym-store/${venueId}/`)
      ));
    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }));
    }
  } catch (e) {
    console.error("[GYM] erase file cleanup failed:", e.message);
  }
}

// Step 3: the actual erase.
async function execute({ venue, user, adminId = null, scopes: rawScopes, token, phrase, acknowledge }) {
  const scopes = normalizeScopes(rawScopes);
  if (acknowledge !== true) throw new AppError("Please tick the confirmation box.", 400);
  if (String(phrase || "").trim() !== CONFIRM_PHRASE) throw new AppError(`Type ${CONFIRM_PHRASE} exactly to continue.`, 400);

  let claims;
  try { claims = jwt.verify(String(token || ""), tokenSecret()); } catch (_) { throw invalidToken(); }
  if (
    claims.purpose !== "gym_data_erase" ||
    claims.uid !== user.id ||
    (claims.aid || null) !== (adminId || null) ||
    claims.vid !== venue.id ||
    JSON.stringify(claims.scopes) !== JSON.stringify(scopes)
  ) {
    throw invalidToken();
  }

  await ensureLogTable(); // if this fails, nothing has been deleted yet
  const venueId = venue.id;
  const files = [];
  const deleted = {};

  await sequelize.transaction(async (t) => {
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:k))", { replacements: { k: `gym_erase:${venueId}` }, transaction: t });

    // A token works once: if an erase was logged after it was issued, it has been used.
    const used = await sequelize.query(
      `SELECT 1 FROM venue_data_erasures WHERE venue_id = :v AND module = 'gym' AND created_at >= to_timestamp(:iat) LIMIT 1`,
      { replacements: { v: venueId, iat: claims.iat }, type: QueryTypes.SELECT, transaction: t }
    );
    if (used.length) throw new AppError("This confirmation was already used. Please start again.", 409, { code: "ERASE_TOKEN_INVALID" });

    const tables = await existingTables(t);

    // Keep what is NOT erased consistent (no dangling links).
    if (scopes.includes("members") && !scopes.includes("store") && tables.has("gym_sales")) {
      await sequelize.query(`UPDATE gym_sales SET member_id = NULL WHERE venue_id = :v AND member_id IS NOT NULL`, { replacements: { v: venueId }, transaction: t });
    }
    if (scopes.includes("members") && !scopes.includes("leads") && tables.has("gym_leads")) {
      await sequelize.query(`UPDATE gym_leads SET converted_member_id = NULL WHERE venue_id = :v AND converted_member_id IS NOT NULL`, { replacements: { v: venueId }, transaction: t });
    }

    for (const step of STEPS) {
      if (!scopes.includes(step.scope) || !tables.has(step.table)) continue;
      if (step.photos) {
        const rows = await sequelize.query(
          `SELECT ${step.photos} AS u FROM ${step.table} WHERE venue_id = :v AND ${step.photos} IS NOT NULL`,
          { replacements: { v: venueId }, type: QueryTypes.SELECT, transaction: t }
        );
        rows.forEach((r) => files.push(r.u));
      }
      const n = await countRows(step, venueId, t);
      await sequelize.query(`DELETE FROM ${step.table} WHERE venue_id = :v${step.where || ""}`, { replacements: { v: venueId }, transaction: t });
      if (step.label) {
        deleted[step.scope] = deleted[step.scope] || {};
        deleted[step.scope][step.label] = (deleted[step.scope][step.label] || 0) + n;
      }
    }

    await sequelize.query(
      `INSERT INTO venue_data_erasures (id, venue_id, module, user_id, user_email, admin_id, scopes, deleted)
       VALUES (:id, :v, 'gym', :u, :e, :a, CAST(:s AS jsonb), CAST(:d AS jsonb))`,
      {
        replacements: {
          id: crypto.randomUUID(), v: venueId, u: user.id, e: user.email || null, a: adminId || null,
          s: JSON.stringify(scopes), d: JSON.stringify(deleted)
        },
        transaction: t
      }
    );
  });

  if (files.length) setImmediate(() => removeFiles(venueId, files));
  console.log(`[GYM] data erased venue=${venueId} user=${user.id} admin=${adminId || "-"} scopes=${scopes.join(",")}`);
  return { erased: deleted, scopes, at: new Date().toISOString() };
}

module.exports = { summary, verifyIdentity, execute, CONFIRM_PHRASE };