// Gym "Body Measurement": full body size, health, treadmill and strength readings per member.
// Every query is limited to ONE venue (venue_id = :v) and every id is validated first.
const { QueryTypes, UniqueConstraintError } = require("sequelize");
const { sequelize } = require("../../config/database");
const { GymMember } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const core = require("./gym.core");
const B = require("../../config/bodyMetrics");
const { GymBodyRecord } = require("./body.models");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_READ = 1000;
const MAX_PER_MEMBER = 2000;
const MAX_SUMMARY_IDS = 50;

const text = (v, max) => String(v === undefined || v === null ? "" : v).trim().slice(0, max);
const needId = (id, label) => {
  if (!UUID_RE.test(String(id))) throw new AppError(`${label} not found`, 404);
  return String(id);
};
const round = (n, d) => { const f = 10 ** d; return Math.round(n * f) / f; };

function ageFrom(dob) {
  if (!dob) return null;
  const today = U.todayIST();
  const age = Number(today.slice(0, 4)) - Number(String(dob).slice(0, 4)) - (today.slice(5) < String(dob).slice(5) ? 1 : 0);
  return age >= 0 && age < 120 ? age : null;
}

/* ------------------------------ config + list summary ------------------------------ */

const config = () => B.publicConfig();

// Last measurement date, number of records and latest weight for the members shown on one page.
// Members who were never measured fall back to the weight saved in their profile.
async function summary(venueId, idsRaw) {
  const ids = [...new Set(String(idsRaw || "").split(",").map((s) => s.trim()).filter((s) => UUID_RE.test(s)))].slice(0, MAX_SUMMARY_IDS);
  if (!ids.length) return { items: {} };
  const [rows, members] = await Promise.all([
    sequelize.query(
      `SELECT DISTINCT ON (member_id) member_id, recorded_on, metrics,
              COUNT(*) OVER (PARTITION BY member_id) AS cnt
         FROM gym_body_records
        WHERE venue_id = :v AND member_id IN (:ids)
        ORDER BY member_id, recorded_on DESC`,
      { replacements: { v: venueId, ids }, type: QueryTypes.SELECT }
    ),
    GymMember.findAll({ where: { venue_id: venueId, id: ids }, attributes: ["id", "weight"] })
  ]);
  const items = {};
  members.forEach((mm) => {
    items[mm.id] = { last_on: null, count: 0, weight: B.parseWeightKg(mm.weight), weight_source: B.parseWeightKg(mm.weight) !== null ? "profile" : null };
  });
  rows.forEach((r) => {
    const it = items[r.member_id];
    if (!it) return;
    it.last_on = r.recorded_on;
    it.count = Number(r.cnt);
    const w = B.num(r.metrics && r.metrics.weight);
    if (w !== null) { it.weight = w; it.weight_source = "record"; }
  });
  return { items };
}

/* ------------------------------ one member ------------------------------ */

const DERIVED_DEFS = {
  bmi: { key: "bmi", label: "BMI", unit: "", kind: "number", group: "derived", better: "none", decimals: 1 },
  whr: { key: "whr", label: "Waist to hip ratio", unit: "", kind: "number", group: "derived", better: "lower", decimals: 2 }
};

function summarizeSeries(def, points) {
  const first = points[0];
  const latest = points[points.length - 1];
  const values = points.map((p) => p.value);
  let best = null;
  if (def.better === "lower") best = Math.min(...values);
  else if (def.better === "higher") best = Math.max(...values);
  let state = "first";
  let delta = 0;
  let pct = null;
  if (points.length > 1) {
    delta = round(latest.value - first.value, 2);
    pct = first.value ? round(Math.abs((delta / first.value) * 100), 1) : null;
    if (delta === 0) state = "same";
    else if (def.better === "none") state = "neutral";
    else state = (def.better === "lower" ? delta < 0 : delta > 0) ? "better" : "worse";
  }
  return {
    key: def.key, label: def.label, label_f: def.label_f || null, unit: def.unit, kind: def.kind, group: def.group, better: def.better, decimals: def.decimals,
    derived: def.group === "derived", points, first, latest, best, delta, pct, state
  };
}

async function memberView(venueId, memberId) {
  const member = await core.findMember(venueId, needId(memberId, "Member"));
  const rows = await GymBodyRecord.findAll({
    where: { venue_id: venueId, member_id: member.id }, order: [["recorded_on", "DESC"]], limit: MAX_READ
  });
  const sex = B.sexOf(member.gender);
  const profW = B.parseWeightKg(member.weight);
  const profH = B.parseHeightCm(member.height);

  // The weight / height already saved on the member profile becomes the starting point automatically.
  const baseDate = member.joined_on || (member.createdAt ? new Date(member.createdAt).toISOString().slice(0, 10) : null);
  const baseline = (profW !== null || profH !== null) && baseDate
    ? { id: null, date: String(baseDate).slice(0, 10), metrics: { ...(profW !== null ? { weight: profW } : {}), ...(profH !== null ? { height: profH } : {}) }, note: "From member profile", recorded_by: null, from_profile: true }
    : null;

  const real = rows.map((r) => ({ id: r.id, date: r.recorded_on, metrics: r.metrics || {}, note: r.note || "", recorded_by: r.recorded_by || "", from_profile: false })).reverse();
  const entries = (baseline ? [baseline, ...real] : real).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // walk oldest -> newest, carrying the last known height forward so BMI stays right
  let h = profH;
  const byKey = new Map();
  const push = (k, pt) => { if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(pt); };
  const merged = {};
  entries.forEach((e) => {
    if (B.num(e.metrics.height) !== null) h = Number(e.metrics.height);
    e.derived = B.derive(e.metrics, { sex, height: h });
    Object.entries(e.metrics).forEach(([k, v]) => {
      const val = B.num(v);
      if (!B.get(k) || val === null) return;
      push(k, { id: e.id, date: e.date, value: val, from_profile: e.from_profile });
      merged[k] = val;
    });
    // BMI and waist/hip ratio are calculated from the values known on that day
    const dv = B.derive({ ...merged }, { sex, height: h });
    if (dv.bmi !== undefined && (e.metrics.weight !== undefined || e.metrics.height !== undefined)) push("bmi", { id: e.id, date: e.date, value: dv.bmi, from_profile: e.from_profile });
    if (dv.whr !== undefined && (e.metrics.waist !== undefined || e.metrics.hips !== undefined)) push("whr", { id: e.id, date: e.date, value: dv.whr, from_profile: e.from_profile });
  });

  const order = new Map(B.METRICS.map((mm, i) => [mm.key, i]));
  const series = [...byKey.entries()]
    .map(([k, pts]) => summarizeSeries(B.get(k) || DERIVED_DEFS[k], pts))
    .sort((a, b) => (order.has(a.key) ? order.get(a.key) : 999) - (order.has(b.key) ? order.get(b.key) : 999));

  const snap = B.insightsFor(merged, { sex, height: B.num(merged.height) || profH });
  return {
    member: {
      id: member.id, name: member.name, member_code: member.member_code, phone: member.phone,
      gender: member.gender || "", sex, age: ageFrom(member.dob), photo_url: member.photo_url || null,
      parent_name: member.parent_name || "", joined_on: member.joined_on || null
    },
    baseline,
    records: real.slice().reverse(),
    series,
    snapshot: { values: merged, derived: snap.derived, insights: snap.insights, as_of: real.length ? real[real.length - 1].date : null },
    truncated: rows.length >= MAX_READ
  };
}

/* ------------------------------ save / delete ------------------------------ */

function cleanMetrics(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AppError("Enter at least one measurement", 400);
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
      if (value === undefined || value === null || String(value).trim() === "") continue;
      const def = B.get(key);
      if (!def) throw new AppError("One of the readings is not available", 400);
      const n = Number(value);
      if (!Number.isFinite(n)) throw new AppError(`${def.label}: enter a valid number`, 400);
      // No "normal range" is enforced: members can be below or above average. Only impossible values are rejected.
      const mustBePositive = def.kind === "length" || def.kind === "weight";
      const lowest = def.min < 0 ? -1000 : 0; // only sit-and-reach can be negative
      if (mustBePositive ? n <= 0 : n < lowest) {
        throw new AppError(`${def.label}: enter a valid ${mustBePositive ? "positive " : ""}value`, 400);
      }
      if (n > 100000) throw new AppError(`${def.label}: this value looks too large, please check it`, 400);
      out[key] = round(n, def.decimals);
    }
    if (!Object.keys(out).length) throw new AppError("Enter at least one measurement", 400);
    const hasS = out.bp_sys !== undefined;
    const hasD = out.bp_dia !== undefined;
    if (hasS !== hasD) throw new AppError("Enter both blood pressure values", 400);
    if (hasS && out.bp_sys <= out.bp_dia) throw new AppError("Systolic pressure must be higher than diastolic", 400);
    return out;
  }

async function saveRecord(venueId, memberId, user, body) {
  const member = await core.findMember(venueId, needId(memberId, "Member"));
  const b = body || {};
  const today = U.todayIST();
  const date = b.recorded_on === undefined || b.recorded_on === null || b.recorded_on === "" ? today : String(b.recorded_on);
  if (!U.isYmd(date)) throw new AppError("Enter a valid date", 400);
  if (U.diffDays(date, today) < 0) throw new AppError("Date cannot be in the future", 400);
  if (U.diffDays(date, today) > 3650) throw new AppError("Date is too old", 400);
  const metrics = cleanMetrics(b.metrics);
  const note = text(b.note, 300) || null;
  const by = text(user && user.name, 80) || null;

  // One record per member per day: saving the same day again replaces that day.
  const write = async () => sequelize.transaction(async (tx) => {
    const found = await GymBodyRecord.findOne({ where: { venue_id: venueId, member_id: member.id, recorded_on: date }, transaction: tx });
    if (found) { await found.update({ metrics, note, recorded_by: by }, { transaction: tx }); return found; }
    const total = await GymBodyRecord.count({ where: { venue_id: venueId, member_id: member.id }, transaction: tx });
    if (total >= MAX_PER_MEMBER) throw new AppError("This member has reached the record limit", 400);
    return GymBodyRecord.create({ venue_id: venueId, member_id: member.id, recorded_on: date, metrics, note, recorded_by: by }, { transaction: tx });
  });
  let row;
  try { row = await write(); } catch (e) {
    if (e instanceof UniqueConstraintError) row = await write(); // two saves of the same day at once
    else throw e;
  }
  return { saved: true, id: row.id, recorded_on: date, count: Object.keys(metrics).length };
}

async function deleteRecord(venueId, id) {
  const row = UUID_RE.test(String(id)) ? await GymBodyRecord.findOne({ where: { id, venue_id: venueId } }) : null;
  if (!row) throw new AppError("Record not found", 404);
  await row.destroy();
  return { deleted: true };
}

// Called when a member is deleted permanently, so no body data is left behind.
async function cleanupMember(venueId, memberId) {
  await GymBodyRecord.destroy({ where: { venue_id: venueId, member_id: memberId } });
}

module.exports = { config, summary, memberView, saveRecord, deleteRecord, cleanupMember };