// Sports Academy / Studio tools: sport profile, batches, tests and progress.
// Every query is limited to ONE venue (venue_id = :v) and every id is validated first.
const crypto = require("crypto");
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const { GymMember } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const core = require("./gym.core");
const D = require("../../config/academyDisciplines");
const { GymMemberProfile, GymBatch, GymBatchMember, GymTestTemplate, GymAssessment } = require("./academy.models");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const MAX_BATCHES = 100;
const MAX_CUSTOM_TESTS = 60;
const MAX_IDS_PER_CALL = 200;

const blank = (v) => v === undefined || v === null || String(v).trim() === "";
const text = (v, max) => String(v === undefined || v === null ? "" : v).trim().slice(0, max);
const round2 = (n) => Math.round(n * 100) / 100;
const needId = (id, label) => {
  if (!UUID_RE.test(String(id))) throw new AppError(`${label} not found`, 404);
  return String(id);
};
function groupOf(variant) {
  const v = D.VARIANTS[variant];
  if (!v) throw new AppError("This section is available for Sports Academy and Studio accounts only", 403);
  return v.group;
}

const customOut = (t) => ({
  id: t.id, key: t.key, label: t.name, unit: t.unit, better: t.better, kind: t.kind,
  discipline: t.discipline, is_active: t.is_active, custom: true
});

function ageFrom(dob) {
  if (!dob) return null;
  const today = U.todayIST();
  const age = Number(today.slice(0, 4)) - Number(String(dob).slice(0, 4)) - (today.slice(5) < String(dob).slice(5) ? 1 : 0);
  return age >= 0 && age < 120 ? age : null;
}

/* ------------------------------ config ------------------------------ */

async function config(venueId, variant) {
  const group = groupOf(variant);
  const custom = await GymTestTemplate.findAll({ where: { venue_id: venueId }, order: [["createdAt", "ASC"]] });
  return { variant: D.VARIANTS[variant], ...D.publicConfig(group), custom_tests: custom.map(customOut) };
}

/* ------------------------------ student profile ------------------------------ */

const emptyProfile = () => ({
  disciplines: [], fields: {}, levels: {}, school: "", blood_group: "", kit_size: "", parent_phone: "", medical_notes: ""
});

function profileOut(row) {
  if (!row) return emptyProfile();
  return {
    disciplines: row.disciplines || [],
    fields: row.fields || {},
    levels: row.levels || {},
    school: row.school || "",
    blood_group: row.blood_group || "",
    kit_size: row.kit_size || "",
    parent_phone: row.parent_phone || "",
    medical_notes: row.medical_notes || ""
  };
}

async function getProfile(venueId, memberId, variant) {
  groupOf(variant);
  const member = await core.findMember(venueId, needId(memberId, "Student"));
  const [row, batches] = await Promise.all([
    GymMemberProfile.findOne({ where: { member_id: member.id, venue_id: venueId } }),
    sequelize.query(
      `SELECT b.id, b.name, b.discipline, b.days, b.start_time, b.end_time
         FROM gym_batch_members bm
         JOIN gym_batches b ON b.id = bm.batch_id AND b.venue_id = bm.venue_id
        WHERE bm.venue_id = :v AND bm.member_id = :m
        ORDER BY b.sort_order, b.start_time`,
      { replacements: { v: venueId, m: member.id }, type: QueryTypes.SELECT }
    )
  ]);
  return {
    member: {
      id: member.id, name: member.name, member_code: member.member_code, phone: member.phone,
      parent_name: member.parent_name || "", dob: member.dob || null, age: ageFrom(member.dob), photo_url: member.photo_url || null
    },
    profile: profileOut(row),
    batches
  };
}

function cleanProfile(body, group) {
  const b = body || {};
  const out = {};

  if (b.disciplines !== undefined) {
    if (!Array.isArray(b.disciplines)) throw new AppError("Invalid sport or class list", 400);
    const list = [...new Set(b.disciplines.map((k) => String(k)))];
    if (list.length > 8) throw new AppError("You can choose up to 8 sports or classes", 400);
    list.forEach((k) => { if (!D.isAllowed(group, k)) throw new AppError("Choose a valid sport or class type", 400); });
    out.disciplines = list;
  }

  if (b.fields !== undefined) {
    if (!b.fields || typeof b.fields !== "object" || Array.isArray(b.fields)) throw new AppError("Invalid details", 400);
    const fields = {};
    for (const [dk, vals] of Object.entries(b.fields)) {
      if (!D.isAllowed(group, dk) || !vals || typeof vals !== "object") continue;
      const clean = {};
      for (const def of D.get(dk).fields) {
        if (vals[def.key] === undefined) continue;
        const v = text(vals[def.key], def.max || 40);
        if (def.type === "select" && v && !def.options.includes(v)) throw new AppError(`Invalid value for ${def.label}`, 400);
        if (v) clean[def.key] = v;
      }
      if (Object.keys(clean).length) fields[dk] = clean;
    }
    out.fields = fields;
  }

  if (b.levels !== undefined) {
    if (!b.levels || typeof b.levels !== "object" || Array.isArray(b.levels)) throw new AppError("Invalid level", 400);
    const levels = {};
    for (const [dk, lv] of Object.entries(b.levels)) {
      if (!D.isAllowed(group, dk)) continue;
      const v = text(lv, 30);
      if (!v) continue;
      if (!D.get(dk).levels.includes(v)) throw new AppError("Invalid level", 400);
      levels[dk] = v;
    }
    out.levels = levels;
  }

  if (b.school !== undefined) out.school = text(b.school, 120) || null;
  if (b.kit_size !== undefined) out.kit_size = text(b.kit_size, 10) || null;
  if (b.medical_notes !== undefined) out.medical_notes = text(b.medical_notes, 1000) || null;
  if (b.blood_group !== undefined) {
    const g = text(b.blood_group, 5);
    if (g && !BLOOD_GROUPS.includes(g)) throw new AppError("Invalid blood group", 400);
    out.blood_group = g || null;
  }
  if (b.parent_phone !== undefined) out.parent_phone = blank(b.parent_phone) ? null : U.normalizePhone(b.parent_phone);
  return out;
}

async function saveProfile(venueId, memberId, variant, body) {
  const group = groupOf(variant);
  const member = await core.findMember(venueId, needId(memberId, "Student"));
  const patch = cleanProfile(body, group);
  await sequelize.transaction(async (tx) => {
    const [row] = await GymMemberProfile.findOrCreate({
      where: { member_id: member.id },
      defaults: { member_id: member.id, venue_id: venueId },
      transaction: tx
    });
    if (row.venue_id !== venueId) throw new AppError("Student not found", 404);
    await row.update(patch, { transaction: tx });
  });
  return getProfile(venueId, member.id, variant);
}

/* ------------------------------ batches ------------------------------ */

function assertAges(min, max) {
  if (min !== null && min !== undefined && max !== null && max !== undefined && min > max) {
    throw new AppError("Minimum age cannot be more than maximum age", 400);
  }
}

function batchFields(b, creating, group) {
  const o = {};
  if (creating || b.name !== undefined) {
    const n = text(b.name, 60);
    if (!n) throw new AppError("Name is required", 400);
    o.name = n;
  }
  if (b.discipline !== undefined) {
    const d = text(b.discipline, 30);
    if (d && !D.isAllowed(group, d)) throw new AppError("Choose a valid sport or class type", 400);
    o.discipline = d || null;
  }
  if (creating || b.days !== undefined) {
    const days = [...new Set((Array.isArray(b.days) ? b.days : []).map(Number))]
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      .sort((a, c) => a - c);
    if (!days.length) throw new AppError("Choose at least one day", 400);
    o.days = days;
  }
  if (creating || b.start_time !== undefined) {
    if (!TIME_RE.test(String(b.start_time || ""))) throw new AppError("Enter a valid start time", 400);
    o.start_time = b.start_time;
  }
  if (creating || b.end_time !== undefined) {
    if (!TIME_RE.test(String(b.end_time || ""))) throw new AppError("Enter a valid end time", 400);
    o.end_time = b.end_time;
  }
  if (b.coach_name !== undefined) o.coach_name = text(b.coach_name, 80) || null;
  if (b.location !== undefined) o.location = text(b.location, 100) || null;
  if (b.level !== undefined) o.level = text(b.level, 30) || null;
  if (b.notes !== undefined) o.notes = text(b.notes, 300) || null;
  if (b.age_min !== undefined) o.age_min = blank(b.age_min) ? null : U.num(b.age_min, "Minimum age", { min: 2, max: 80, int: true });
  if (b.age_max !== undefined) o.age_max = blank(b.age_max) ? null : U.num(b.age_max, "Maximum age", { min: 2, max: 80, int: true });
  if (b.capacity !== undefined) o.capacity = blank(b.capacity) ? null : U.num(b.capacity, "Capacity", { min: 1, max: 5000, int: true });
  if (b.is_active !== undefined) o.is_active = !!b.is_active;
  if (b.sort_order !== undefined) o.sort_order = U.num(b.sort_order || 0, "Sort order", { max: 1000, int: true });
  return o;
}

async function loadBatch(venueId, id, tx) {
  const batch = UUID_RE.test(String(id)) ? await GymBatch.findOne({ where: { id, venue_id: venueId }, transaction: tx }) : null;
  if (!batch) throw new AppError("Not found", 404);
  return batch;
}

async function listBatches(venueId, all) {
  const [rows, counts] = await Promise.all([
    GymBatch.findAll({
      where: { venue_id: venueId, ...(all ? {} : { is_active: true }) },
      order: [["sort_order", "ASC"], ["start_time", "ASC"], ["name", "ASC"]]
    }),
    sequelize.query(
      `SELECT bm.batch_id, COUNT(*)::int AS total
         FROM gym_batch_members bm
         JOIN gym_members m ON m.id = bm.member_id AND m.venue_id = bm.venue_id
        WHERE bm.venue_id = :v AND m.is_archived = false
        GROUP BY bm.batch_id`,
      { replacements: { v: venueId }, type: QueryTypes.SELECT }
    )
  ]);
  const byBatch = new Map(counts.map((r) => [r.batch_id, r.total]));
  return rows.map((b) => ({ ...b.toJSON(), student_count: byBatch.get(b.id) || 0 }));
}

async function batchDetail(venueId, id) {
  const batch = await loadBatch(venueId, id);
  const students = await sequelize.query(
    `SELECT m.id, m.name, m.member_code, m.phone, m.status, m.end_date, m.photo_url
       FROM gym_batch_members bm
       JOIN gym_members m ON m.id = bm.member_id AND m.venue_id = bm.venue_id
      WHERE bm.venue_id = :v AND bm.batch_id = :b AND m.is_archived = false
      ORDER BY m.name`,
    { replacements: { v: venueId, b: batch.id }, type: QueryTypes.SELECT }
  );
  return { batch: { ...batch.toJSON(), student_count: students.length }, students };
}

async function createBatch(venueId, variant, body) {
  const group = groupOf(variant);
  const o = batchFields(body || {}, true, group);
  assertAges(o.age_min, o.age_max);
  if ((await GymBatch.count({ where: { venue_id: venueId } })) >= MAX_BATCHES) {
    throw new AppError(`You can create up to ${MAX_BATCHES} batches`, 400);
  }
  return GymBatch.create({ ...o, venue_id: venueId });
}

async function updateBatch(venueId, variant, id, body) {
  const group = groupOf(variant);
  const batch = await loadBatch(venueId, id);
  const o = batchFields(body || {}, false, group);
  assertAges("age_min" in o ? o.age_min : batch.age_min, "age_max" in o ? o.age_max : batch.age_max);
  await batch.update(o);
  return batch;
}

async function removeBatch(venueId, id) {
  await sequelize.transaction(async (tx) => {
    const batch = await loadBatch(venueId, id, tx);
    await GymBatchMember.destroy({ where: { batch_id: batch.id, venue_id: venueId }, transaction: tx });
    await batch.destroy({ transaction: tx });
  });
  return { deleted: true };
}

async function addStudents(venueId, id, memberIds) {
  const ids = [...new Set((Array.isArray(memberIds) ? memberIds : []).map(String))];
  if (!ids.length) throw new AppError("Choose at least one student", 400);
  if (ids.length > MAX_IDS_PER_CALL) throw new AppError(`Add up to ${MAX_IDS_PER_CALL} students at a time`, 400);
  if (ids.some((m) => !UUID_RE.test(m))) throw new AppError("Student not found", 404);

  return sequelize.transaction(async (tx) => {
    const batch = await GymBatch.findOne({ where: { id: needId(id, "Batch"), venue_id: venueId }, transaction: tx, lock: tx.LOCK.UPDATE });
    if (!batch) throw new AppError("Not found", 404);

    const found = await GymMember.findAll({ where: { id: ids, venue_id: venueId, is_archived: false }, attributes: ["id"], transaction: tx });
    if (found.length !== ids.length) throw new AppError("One or more students were not found", 400);

    const existing = await GymBatchMember.findAll({ where: { batch_id: batch.id, venue_id: venueId }, attributes: ["member_id"], transaction: tx });
    const have = new Set(existing.map((e) => e.member_id));
    const fresh = ids.filter((m) => !have.has(m));

    if (batch.capacity && fresh.length) {
      const rows = await sequelize.query(
        `SELECT COUNT(*)::int AS n FROM gym_batch_members bm
           JOIN gym_members m ON m.id = bm.member_id AND m.venue_id = bm.venue_id
          WHERE bm.batch_id = :b AND bm.venue_id = :v AND m.is_archived = false`,
        { replacements: { b: batch.id, v: venueId }, type: QueryTypes.SELECT, transaction: tx }
      );
      if (Number(rows[0].n) + fresh.length > batch.capacity) {
        throw new AppError(`This batch is full (capacity ${batch.capacity}).`, 409);
      }
    }
    if (fresh.length) {
      await GymBatchMember.bulkCreate(
        fresh.map((member_id) => ({ batch_id: batch.id, member_id, venue_id: venueId, joined_on: U.todayIST() })),
        { transaction: tx }
      );
    }
    return { added: fresh.length };
  });
}

async function removeStudent(venueId, id, memberId) {
  const batch = await loadBatch(venueId, id);
  if (!UUID_RE.test(String(memberId))) throw new AppError("Student not found", 404);
  await GymBatchMember.destroy({ where: { batch_id: batch.id, member_id: memberId, venue_id: venueId } });
  return { removed: true };
}

/* ------------------------------ tests ------------------------------ */

function testFields(b, creating, group) {
  const o = {};
  if (creating || b.name !== undefined) {
    const n = text(b.name, 80);
    if (!n) throw new AppError("Test name is required", 400);
    o.name = n;
  }
  if (creating || b.kind !== undefined) {
    const kind = text(b.kind || "measure", 10);
    if (!["measure", "rating"].includes(kind)) throw new AppError("Invalid test type", 400);
    o.kind = kind;
  }
  const kind = o.kind || (b.kind === "rating" ? "rating" : "measure");
  if (creating || b.unit !== undefined) o.unit = kind === "rating" && creating ? "/5" : text(b.unit, 15);
  if (creating || b.better !== undefined) {
    const better = kind === "rating" && creating ? "higher" : text(b.better || "higher", 6);
    if (!["lower", "higher", "none"].includes(better)) throw new AppError("Invalid value for 'better'", 400);
    o.better = better;
  }
  if (b.discipline !== undefined) {
    const d = text(b.discipline, 30);
    if (d && !D.isAllowed(group, d)) throw new AppError("Choose a valid sport or class type", 400);
    o.discipline = d || null;
  }
  if (b.is_active !== undefined) o.is_active = !!b.is_active;
  return o;
}

async function createTest(venueId, variant, body) {
  const group = groupOf(variant);
  const o = testFields(body || {}, true, group);
  if ((await GymTestTemplate.count({ where: { venue_id: venueId } })) >= MAX_CUSTOM_TESTS) {
    throw new AppError(`You can add up to ${MAX_CUSTOM_TESTS} custom tests`, 400);
  }
  const row = await GymTestTemplate.create({ ...o, venue_id: venueId, key: `custom.${crypto.randomBytes(5).toString("hex")}` });
  return customOut(row);
}

async function loadTest(venueId, id) {
  const row = UUID_RE.test(String(id)) ? await GymTestTemplate.findOne({ where: { id, venue_id: venueId } }) : null;
  if (!row) throw new AppError("Test not found", 404);
  return row;
}

async function updateTest(venueId, variant, id, body) {
  const group = groupOf(variant);
  const row = await loadTest(venueId, id);
  const b = body || {};
  const o = testFields({ ...b, kind: undefined }, false, group);
  delete o.kind; // the type of a test cannot change after results exist
  await row.update(o);
  return customOut(row);
}

async function deleteTest(venueId, id) {
  const row = await loadTest(venueId, id);
  const used = await GymAssessment.count({ where: { venue_id: venueId, test_key: row.key } });
  if (used > 0) {
    await row.update({ is_active: false }); // keep old results readable
    return { archived: true };
  }
  await row.destroy();
  return { deleted: true };
}

/* ------------------------------ results & progress ------------------------------ */

async function metaMap(venueId) {
  const custom = await GymTestTemplate.findAll({ where: { venue_id: venueId } });
  const map = new Map(custom.map((t) => [t.key, { ...customOut(t) }]));
  return (key) => map.get(key) || D.findBuiltinTest(key) || null;
}

async function recordResults(venueId, variant, memberId, user, body) {
  groupOf(variant);
  const member = await core.findMember(venueId, needId(memberId, "Student"));
  const b = body || {};

  const today = U.todayIST();
  const date = blank(b.recorded_on) ? today : String(b.recorded_on);
  if (!U.isYmd(date)) throw new AppError("Enter a valid date", 400);
  if (U.diffDays(date, today) < 0) throw new AppError("Date cannot be in the future", 400);
  if (U.diffDays(date, today) > 1100) throw new AppError("Date is too old", 400);

  const raw = (Array.isArray(b.entries) ? b.entries : []).filter((e) => e && !blank(e.value));
  if (!raw.length) throw new AppError("Enter at least one result", 400);
  if (raw.length > 40) throw new AppError("Enter up to 40 results at a time", 400);

  const find = await metaMap(venueId);
  const seen = new Set();
  const rows = raw.map((e) => {
    const key = String(e.test_key || "");
    const meta = find(key);
    if (!meta || meta.is_active === false) throw new AppError("One of the tests is not available", 400);
    if (seen.has(key)) throw new AppError(`${meta.label} is entered twice`, 400);
    seen.add(key);
    const value = Number(e.value);
    if (!Number.isFinite(value) || value < 0 || value > 1000000) throw new AppError(`Enter a valid number for ${meta.label}`, 400);
    if (meta.kind === "rating" && (!Number.isInteger(value) || value < 1 || value > 5)) {
      throw new AppError(`${meta.label} must be rated from 1 to 5`, 400);
    }
    return {
      venue_id: venueId, member_id: member.id, test_key: key, value: round2(value), recorded_on: date,
      note: text(b.note, 200) || null, recorded_by: text(user && user.name, 80) || null
    };
  });

  await sequelize.transaction(async (tx) => {
    // One value per test per day: entering it again replaces the earlier one.
    await GymAssessment.destroy({ where: { venue_id: venueId, member_id: member.id, test_key: [...seen], recorded_on: date }, transaction: tx });
    await GymAssessment.bulkCreate(rows, { transaction: tx });
  });
  return { saved: rows.length, recorded_on: date };
}

function summarize(key, meta, rows) {
  const series = rows.map((r) => ({ id: r.id, date: r.recorded_on, value: Number(r.value), note: r.note || "" }));
  const first = series[0];
  const latest = series[series.length - 1];
  const previous = series.length > 1 ? series[series.length - 2] : null;
  const values = series.map((s) => s.value);
  let best = null;
  if (meta.better === "lower") best = Math.min(...values);
  else if (meta.better === "higher") best = Math.max(...values);
  const delta = previous ? round2(latest.value - previous.value) : null;
  const improved = delta === null || delta === 0 || meta.better === "none" ? null : meta.better === "lower" ? delta < 0 : delta > 0;
  return {
    test_key: key, label: meta.label, unit: meta.unit, better: meta.better, kind: meta.kind,
    series, first, latest, previous, best, delta, improved
  };
}

async function progress(venueId, variant, memberId) {
  groupOf(variant);
  const member = await core.findMember(venueId, needId(memberId, "Student"));
  const [rows, find] = await Promise.all([
    GymAssessment.findAll({
      where: { venue_id: venueId, member_id: member.id },
      order: [["recorded_on", "ASC"], ["createdAt", "ASC"]],
      limit: 3000
    }),
    metaMap(venueId)
  ]);
  const byKey = new Map();
  rows.forEach((r) => { if (!byKey.has(r.test_key)) byKey.set(r.test_key, []); byKey.get(r.test_key).push(r); });
  const items = [...byKey.entries()].map(([key, list]) =>
    summarize(key, find(key) || { label: "Removed test", unit: "", better: "none", kind: "measure" }, list));
  items.sort((a, b) => (a.latest.date < b.latest.date ? 1 : a.latest.date > b.latest.date ? -1 : a.label.localeCompare(b.label)));
  return { items };
}

async function deleteResult(venueId, id) {
  const row = UUID_RE.test(String(id)) ? await GymAssessment.findOne({ where: { id, venue_id: venueId } }) : null;
  if (!row) throw new AppError("Result not found", 404);
  await row.destroy();
  return { deleted: true };
}

// Called when a student is deleted permanently, so no progress data is left behind.
async function cleanupMember(venueId, memberId) {
  await sequelize.transaction(async (tx) => {
    const where = { venue_id: venueId, member_id: memberId };
    await GymAssessment.destroy({ where, transaction: tx });
    await GymBatchMember.destroy({ where, transaction: tx });
    await GymMemberProfile.destroy({ where, transaction: tx });
  });
}

module.exports = {
  config, getProfile, saveProfile,
  listBatches, batchDetail, createBatch, updateBatch, removeBatch, addStudents, removeStudent,
  createTest, updateTest, deleteTest,
  recordResults, progress, deleteResult, cleanupMember
};