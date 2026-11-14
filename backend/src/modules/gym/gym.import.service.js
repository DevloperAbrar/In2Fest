const { Op, UniqueConstraintError } = require("sequelize");
const { sequelize, GymPlan, GymMember, GymMembership, GymPayment } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const C = require("./gym.constants");
const core = require("./gym.core");

const MAX_ROWS = 200; // per request. The screen sends batches.
const MAX_MONEY = 10000000;
const MIN_DATE = "2000-01-01";
const FILL_KEYS = ["email", "gender", "dob", "goal", "trainer_name", "health_notes", "emergency_name", "emergency_phone", "notes"];

class RowError extends Error {}

// Trim, cap the length and drop control characters (a NUL byte would make Postgres reject the row).
const clean = (v, max) =>
  String(v === null || v === undefined ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

// U.isYmd alone accepts impossible dates such as 2026-02-31, so the date must also survive a round trip.
const realYmd = (v) => {
  const s = clean(v, 10);
  return s && U.isYmd(s) && U.addDays(s, 0) === s ? s : null;
};

// Accepts "9876543210", "+91 98765 43210", "09876543210", "98765/98766" (first valid number wins).
function pickPhone(raw) {
  const text = clean(raw, 60);
  if (!text) return null;
  const tries = text.split(/[\/,;|]+/).map((s) => s.trim()).filter(Boolean);
  if (tries.length === 1 && /\s/.test(tries[0])) {
    const bits = tries[0].split(/\s+/);
    if (bits.length > 1 && bits.every((b) => b.replace(/\D/g, "").length >= 10)) tries.push(...bits);
  }
  for (const t of tries) {
    try { return U.normalizePhone(t); } catch (_) { /* try the next one */ }
  }
  return null;
}

// "Rs. 1,200/-" -> 1200. Text such as "NA" or "-" counts as empty.
function money(v, label) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const m = String(v).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  if (n < 0) throw new RowError(`${label} cannot be negative`);
  if (n > MAX_MONEY) throw new RowError(`${label} is too large`);
  return U.money(n);
}

function genderOf(v) {
  const s = clean(v, 20).toLowerCase();
  if (!s) return { value: null };
  if (/^(m|male|man|boy|gent|gents)$/.test(s)) return { value: "male" };
  if (/^(f|female|woman|girl|lady|ladies)$/.test(s)) return { value: "female" };
  if (/^(o|other|others)$/.test(s)) return { value: "other" };
  return { value: null, warn: `Gender '${clean(v, 15)}' was not recognised and was skipped` };
}

const GOAL_RULES = [
  ["muscle_gain", /muscle|bulk|mass|gain|building|physique/],
  ["fat_loss", /fat|weight|loss|lose|slim|cutting|belly/],
  ["strength", /strength|power/],
  ["flexibility", /flex|yoga|stretch|mobility/],
  ["endurance", /endur|stamina|cardio|running/],
  ["rehab", /rehab|injur|recover|physio/],
  ["general_fitness", /general|fit|health|wellness|maintain|tone|toning/]
];
function goalOf(v) {
  const s = clean(v, 40).toLowerCase();
  if (!s) return { value: null };
  const direct = s.replace(/[\s-]+/g, "_");
  if (C.GOALS.includes(direct)) return { value: direct };
  for (const [key, re] of GOAL_RULES) if (re.test(s)) return { value: key };
  return { value: null, warn: `Goal '${clean(v, 20)}' was not recognised and was skipped` };
}

// Start date of a membership that ends on `end` (reverse of U.membershipEnd).
const backStart = (end, plan) =>
  plan.duration_unit === "months" ? U.addMonths(U.addDays(end, 1), -plan.duration_value) : U.addDays(end, -(plan.duration_value - 1));

/* Turns one raw row into clean, validated data. No database access here. */
function prepare(raw, plans, today, withPayments) {
  const r = raw && typeof raw === "object" ? raw : {};
  const bad = r.bad && typeof r.bad === "object" ? r.bad : {};
  const errors = [];
  const warnings = [];
  const out = { row: Number.isInteger(r._row) ? r._row : null, errors, warnings, name: "", phone: null, fields: null, ms: null, joined: null };

  const name = clean(r.name, 100);
  if (name.length < 2) errors.push("Name is missing");
  const phone = bad.phone ? null : pickPhone(r.phone);
  if (bad.phone) errors.push(`Mobile '${clean(bad.phone, 20)}' was damaged by Excel (scientific format). Set the Mobile column to Text in Excel and export the CSV again`);
  else if (!phone) errors.push(clean(r.phone, 30) ? `Mobile '${clean(r.phone, 30)}' is not a valid 10-digit number` : "Mobile number is missing");
  out.name = name;
  out.phone = phone;

  const fields = { name, phone, source: "import" };

  const email = clean(r.email, 120);
  if (email) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = email;
    else warnings.push(`Email '${email}' is not valid and was skipped`);
  }
  const g = genderOf(r.gender);
  if (g.value) fields.gender = g.value;
  if (g.warn) warnings.push(g.warn);
  const goal = goalOf(r.goal);
  if (goal.value) fields.goal = goal.value;
  if (goal.warn) warnings.push(goal.warn);

  const dob = realYmd(r.dob);
  if (dob && dob >= "1920-01-01" && dob < today) fields.dob = dob;
  else if (clean(r.dob, 12) || bad.dob) warnings.push("Date of birth was not valid and was skipped");

  const trainer = clean(r.trainer_name, 100);
  if (trainer) fields.trainer_name = trainer;
  const health = clean(r.health_notes, 1000);
  if (health) fields.health_notes = health;
  const emName = clean(r.emergency_name, 100);
  if (emName) fields.emergency_name = emName;
  const emPhone = clean(r.emergency_phone, 30).replace(/\D/g, "").slice(0, 15);
  if (emPhone) fields.emergency_phone = emPhone;
  const oldId = clean(r.old_id, 40);
  const notes = [clean(r.notes, 900), oldId ? `Previous ID: ${oldId}` : ""].filter(Boolean).join(" | ");
  if (notes) fields.notes = notes.slice(0, 1000);

  /* plan */
  let plan = null;
  if (r.plan_id) {
    plan = plans.get(String(r.plan_id)) || null;
    if (!plan) errors.push("The selected plan no longer exists");
  }
  const planLabel = plan ? plan.name : clean(r.plan, 80);

  /* dates */
  if (bad.start_date) errors.push(`Start date '${clean(bad.start_date, 20)}' could not be read`);
  if (bad.end_date) errors.push(`End date '${clean(bad.end_date, 20)}' could not be read`);
  if (bad.joined_on) warnings.push(`Joining date '${clean(bad.joined_on, 20)}' could not be read and was skipped`);
  let start = realYmd(r.start_date);
  let end = realYmd(r.end_date);
  const joined = realYmd(r.joined_on);
  if (clean(r.start_date, 12) && !start) errors.push("Start date is not valid");
  if (clean(r.end_date, 12) && !end) errors.push("End date is not valid");

  if (!start && joined && (!end || joined <= end)) start = joined;
  if (start && !end && plan) end = U.membershipEnd(start, plan.duration_unit, plan.duration_value);
  if (end && !start) {
    if (plan) start = backStart(end, plan);
    else { start = end; warnings.push("Start date was missing, so the end date is used as the start date"); }
  }
  if (start && !end) {
    warnings.push("No end date and no plan, so no membership was created for this member");
    start = null;
  }
  if (start && end) {
    if (end < start) errors.push("End date is before the start date");
    else if (U.diffDays(start, end) > 1830) errors.push("Membership is longer than 5 years, please check the dates");
    if (start < MIN_DATE) errors.push("Start date is too old, please check the year");
    if (start > U.addDays(today, 400)) errors.push("Start date is too far in the future");
  }
  out.joined = joined && joined <= (end || today) ? joined : null;

  /* money */
  let fee = null, paid = null, due = null;
  try {
    fee = money(r.fee, "Amount");
    paid = money(r.paid, "Paid amount");
    due = money(r.due, "Balance due");
  } catch (e) {
    if (e instanceof RowError) errors.push(e.message); else throw e;
  }

  out.fields = fields;
  if (!errors.length) {
    if (due === null) due = fee !== null && paid !== null ? U.money(Math.max(fee - paid, 0)) : 0;
    if (paid === null) paid = fee !== null ? U.money(Math.max(fee - due, 0)) : 0; // only an amount given: treated as paid in full
    // Default: only the dues are brought over, so collections and receipts of this app stay clean.
    const total = withPayments ? U.money(paid + due) : due;
    const paidStored = withPayments ? paid : 0;
    if (start && end) out.ms = { start, end, total, paid: paidStored, plan, planLabel: planLabel || "Imported plan" };
    else if (due > 0 || (withPayments && paid > 0)) warnings.push("Amounts were skipped because this member has no membership dates");
  }
  return out;
}

/* Creates the member (+ latest membership, + optional payment) in one transaction. */
function writeNew(venue, p, today, receivedBy, settings) {
  return sequelize.transaction(async (tx) => {
    const seq = await core.nextSeq(tx, venue.id, "gym_members", "seq");
    const member_code = await core.makeMemberCode(tx, venue.id, settings && settings.member_id_mode, seq);
    const base = {
      ...p.fields, venue_id: venue.id, seq, member_code, portal_token: U.token(), is_archived: false
    };
    const ms = p.ms;
    if (!ms) return GymMember.create({ ...base, joined_on: p.joined, status: "new" }, { transaction: tx });

    const planId = ms.plan ? ms.plan.id : null;
    const member = await GymMember.create({
      ...base, plan_id: planId, plan_name: ms.planLabel, has_pt: false, start_date: ms.start, end_date: ms.end,
      joined_on: p.joined || ms.start, status: ms.end < today ? "expired" : "active",
      balance_due: Math.max(U.money(ms.total - ms.paid), 0), total_paid: ms.paid
    }, { transaction: tx });
    const membership = await GymMembership.create({
      venue_id: venue.id, member_id: member.id, plan_id: planId, plan_name: ms.planLabel, kind: "new",
      start_date: ms.start, end_date: ms.end, base_price: ms.total, discount_amount: 0, joining_fee: 0, pt_amount: 0,
      total_amount: ms.total, amount_paid: ms.paid, tax_rate: ms.plan ? ms.plan.tax_rate : 0, has_pt: false,
      notes: "Imported from previous software"
    }, { transaction: tx });
    if (ms.paid > 0) {
      await GymPayment.create({
        venue_id: venue.id, member_id: member.id, membership_id: membership.id, amount: ms.paid, mode: "other", status: "paid",
        paid_on: ms.start > today ? today : ms.start, received_by: receivedBy, notes: "Imported from previous software", meta: { imported: true }
      }, { transaction: tx });
    }
    return member;
  });
}

// Existing member: only EMPTY details are filled. Membership and payments are never touched.
async function fillBlanks(existing, fields, write) {
  const patch = {};
  for (const k of FILL_KEYS) if (fields[k] && !existing[k]) patch[k] = fields[k];
  const keys = Object.keys(patch);
  if (keys.length && write) await existing.update(patch);
  return keys;
}

async function process(ctx, body, commit) {
  const { venue, user } = ctx;
  const rows = body && Array.isArray(body.rows) ? body.rows : null;
  if (!rows || !rows.length) throw new AppError("No rows to import", 400);
  if (rows.length > MAX_ROWS) throw new AppError(`Send at most ${MAX_ROWS} rows per request`, 400);
  const opt = (body && body.options) || {};
  const onDup = opt.on_duplicate === "fill" ? "fill" : "skip";
  const withPayments = !!opt.import_payments;
  const today = U.todayIST();

  const plans = new Map((await GymPlan.findAll({ where: { venue_id: venue.id } })).map((p) => [p.id, p]));
  const prepared = rows.map((r) => prepare(r, plans, today, withPayments));

  // same mobile twice inside this batch: the first one wins
  const seen = new Map();
  for (const p of prepared) {
    if (p.errors.length || !p.phone) continue;
    if (seen.has(p.phone)) p.errors.push(`Same mobile number as row ${seen.get(p.phone)} in this file`);
    else seen.set(p.phone, p.row != null ? p.row : "above");
  }
  const phones = [...seen.keys()];
  const existing = phones.length
    ? await GymMember.findAll({ where: { venue_id: venue.id, is_archived: false, phone: { [Op.in]: phones } } })
    : [];
  const byPhone = new Map(existing.map((m) => [m.phone, m]));

  const sum = { total: prepared.length, created: 0, updated: 0, skipped: 0, errors: 0 };
  const results = [];
  for (const p of prepared) {
    const base = { row: p.row, name: p.name, phone: p.phone };
    if (p.errors.length) { sum.errors++; results.push({ ...base, status: "error", messages: p.errors, warnings: [] }); continue; }

    const dup = byPhone.get(p.phone);
    if (dup) {
      if (onDup === "skip") {
        sum.skipped++;
        results.push({ ...base, status: "skipped", messages: [`Already a member: ${dup.name} (${dup.member_code})`], warnings: [] });
        continue;
      }
      try {
        const keys = await fillBlanks(dup, p.fields, commit);
        if (!keys.length) {
          sum.skipped++;
          results.push({ ...base, status: "skipped", messages: [`Already a member (${dup.member_code}), nothing new to add`], warnings: [] });
        } else {
          sum.updated++;
          results.push({ ...base, status: "updated", messages: [`Existing member ${dup.member_code}: ${keys.length} blank detail(s) filled`], warnings: p.warnings });
        }
      } catch (e) {
        console.error("[GYM] import fill failed:", e.message);
        sum.errors++;
        results.push({ ...base, status: "error", messages: ["Could not update this member. Please retry"], warnings: [] });
      }
      continue;
    }

    if (!commit) { sum.created++; results.push({ ...base, status: "created", messages: [], warnings: p.warnings }); continue; }
    try {
      const m = await writeNew(venue, p, today, user && user.name, ctx.settings);      sum.created++;
      results.push({ ...base, status: "created", member_code: m.member_code, messages: [], warnings: p.warnings });
    } catch (e) {
      sum.errors++;
      const dupErr = e instanceof UniqueConstraintError;
      if (!dupErr) console.error("[GYM] import row failed:", e.message);
      results.push({ ...base, status: "error", messages: [dupErr ? "This mobile number was just added by someone else" : "Could not save this row. Please retry"], warnings: [] });
    }
  }

  if (commit) {
    console.log(`[GYM] Import venue ${venue.id} by ${(user && (user.id || user.name)) || "unknown"}: created ${sum.created}, updated ${sum.updated}, skipped ${sum.skipped}, errors ${sum.errors}`);
  }
  return { summary: sum, rows: results };
}

function templateCsv() {
  const head = ["Name", "Mobile", "Email", "Gender", "Date of Birth", "Plan", "Start Date", "End Date", "Amount", "Paid", "Balance Due", "Trainer", "Goal", "Notes"];
  const rows = [
    ["Rahul Sharma", "9876543210", "rahul@example.com", "Male", "15/08/1995", "3 Months", "01/09/2026", "30/11/2026", "6000", "5000", "1000", "Amit", "Fat loss", "Knee injury in 2024"],
    ["Priya Verma", "9123456780", "", "Female", "", "1 Year", "10/01/2026", "09/01/2027", "12000", "12000", "0", "", "Muscle gain", ""]
  ];
  const cell = (v) => (/[",\r\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return `\uFEFF${[head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")}`;
}

module.exports = {
  validate: (ctx, body) => process(ctx, body, false), // dry run, writes nothing
  run: (ctx, body) => process(ctx, body, true),
  templateCsv
};