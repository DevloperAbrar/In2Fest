const { sequelize } = require("../../config/database");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const core = require("./gym.core");
const { GymShift, GymMemberShift } = require("./gym.shift.models");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_SHIFTS = 30;
const blank = (v) => v === undefined || v === null || String(v).trim() === "";

function shiftFields(b, creating) {
  const o = {};
  if (creating || b.name !== undefined) {
    const n = String(b.name || "").trim();
    if (!n) throw new AppError("Shift name is required", 400);
    o.name = n.slice(0, 60);
  }
  if (creating || b.start_time !== undefined) {
    if (!TIME_RE.test(String(b.start_time || ""))) throw new AppError("Enter a valid start time", 400);
    o.start_time = b.start_time;
  }
  if (creating || b.end_time !== undefined) {
    if (!TIME_RE.test(String(b.end_time || ""))) throw new AppError("Enter a valid end time", 400);
    o.end_time = b.end_time;
  }
  if (b.capacity !== undefined) o.capacity = blank(b.capacity) ? null : U.num(b.capacity, "Capacity", { min: 1, max: 5000, int: true });
  if (b.is_active !== undefined) o.is_active = !!b.is_active;
  if (b.sort_order !== undefined) o.sort_order = U.num(b.sort_order || 0, "Sort order", { max: 1000, int: true });
  return o;
}

function assertTimes(start, end) {
  if (start === end) throw new AppError("Start and end time cannot be the same", 400);
}

async function loadShift(venueId, id, tx) {
  const s = UUID_RE.test(String(id)) ? await GymShift.findOne({ where: { id, venue_id: venueId }, transaction: tx }) : null;
  if (!s) throw new AppError("Shift not found", 404);
  return s;
}

// Counts of live (not archived) members per shift.
async function countsByShift(venueId) {
  const today = U.todayIST();
  const [rows] = await sequelize.query(
    `SELECT ms.shift_id,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE m.status NOT IN ('frozen','cancelled') AND m.end_date >= :today)::int AS active
       FROM gym_member_shifts ms
       JOIN gym_members m ON m.id = ms.member_id AND m.venue_id = ms.venue_id
      WHERE ms.venue_id = :v AND m.is_archived = false
      GROUP BY ms.shift_id`,
    { replacements: { v: venueId, today } }
  );
  return new Map(rows.map((r) => [r.shift_id, { total: r.total, active: r.active }]));
}

async function list(venueId, all) {
  const [shifts, counts] = await Promise.all([
    GymShift.findAll({ where: { venue_id: venueId, ...(all ? {} : { is_active: true }) }, order: [["sort_order", "ASC"], ["start_time", "ASC"], ["name", "ASC"]] }),
    countsByShift(venueId)
  ]);
  const items = shifts.map((s) => ({ ...s.toJSON(), member_count: (counts.get(s.id) || {}).total || 0, active_count: (counts.get(s.id) || {}).active || 0 }));
  const [[un]] = await sequelize.query(
    `SELECT COUNT(*)::int AS n FROM gym_members m
      WHERE m.venue_id = :v AND m.is_archived = false AND m.status <> 'cancelled'
        AND NOT EXISTS (SELECT 1 FROM gym_member_shifts ms WHERE ms.member_id = m.id)`,
    { replacements: { v: venueId } }
  );
  return { items, unassigned: un ? un.n : 0 };
}

async function assertNameFree(venueId, name, exceptId) {
  const rows = await GymShift.findAll({ where: { venue_id: venueId }, attributes: ["id", "name"] });
  if (rows.some((r) => r.id !== exceptId && r.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    throw new AppError("A shift with this name already exists", 409);
  }
}

async function create(venueId, b) {
  const f = shiftFields(b, true);
  assertTimes(f.start_time, f.end_time);
  if ((await GymShift.count({ where: { venue_id: venueId } })) >= MAX_SHIFTS) throw new AppError(`You can create up to ${MAX_SHIFTS} shifts`, 400);
  await assertNameFree(venueId, f.name);
  return GymShift.create({ ...f, venue_id: venueId });
}

async function update(venueId, id, b) {
  const s = await loadShift(venueId, id);
  const f = shiftFields(b, false);
  assertTimes(f.start_time || s.start_time, f.end_time || s.end_time);
  if (f.name) await assertNameFree(venueId, f.name, s.id);
  return s.update(f);
}

// A shift that still has members is deactivated (so no history is lost); an empty one is deleted.
async function remove(venueId, id) {
  const s = await loadShift(venueId, id);
  if (await GymMemberShift.count({ where: { shift_id: s.id, venue_id: venueId } })) {
    await s.update({ is_active: false });
    return { archived: true };
  }
  await s.destroy();
  return { deleted: true };
}

// The shift with the members assigned to it.
async function detail(venueId, id) {
  const s = await loadShift(venueId, id);
  const [rows] = await sequelize.query(
    `SELECT m.id, m.member_code, m.name, m.phone, m.photo_url, m.status, m.plan_name, m.start_date, m.end_date, m.balance_due, m.has_pt, m.trainer_name
       FROM gym_member_shifts ms
       JOIN gym_members m ON m.id = ms.member_id AND m.venue_id = ms.venue_id
      WHERE ms.shift_id = :s AND ms.venue_id = :v AND m.is_archived = false
      ORDER BY m.name ASC
      LIMIT 1000`,
    { replacements: { s: s.id, v: venueId } }
  );
  const today = U.todayIST();
  const members = rows.map((r) => core.present(r, today));
  return { shift: s, members, total: members.length, active: members.filter((m) => ["active", "expiring"].includes(m.display_status)).length };
}

// Returns a valid active shift id for this venue, or null when the owner chose "no shift".
async function checkShift(venueId, shiftId) {
  if (blank(shiftId)) return null;
  const s = await loadShift(venueId, shiftId);
  if (!s.is_active) throw new AppError("This shift is inactive", 409);
  return s.id;
}

async function assign(venueId, memberId, shiftId) {
  await core.findMember(venueId, memberId);
  if (!shiftId) {
    await GymMemberShift.destroy({ where: { member_id: memberId, venue_id: venueId } });
    return null;
  }
  await GymMemberShift.upsert({ member_id: memberId, venue_id: venueId, shift_id: shiftId });
  return shiftId;
}

const unassign = (venueId, memberId) => GymMemberShift.destroy({ where: { member_id: memberId, venue_id: venueId } });

// Adds shift_id / shift_name to a member object or a list of them. One query for a whole page.
async function decorate(venueId, members) {
  try {
    return await decorateRaw(venueId, members);
  } catch (e) {
    // Shifts are optional: if anything goes wrong here the member screens must keep working.
    console.error("[GYM] shift decorate failed:", e.message);
    return members;
  }
}

async function decorateRaw(venueId, members) {
  const arr = Array.isArray(members) ? members : [members];
  const ids = arr.map((m) => m && m.id).filter(Boolean);
  if (!ids.length) return members;
  const [rows] = await sequelize.query(
    `SELECT ms.member_id, s.id AS shift_id, s.name, s.start_time, s.end_time
       FROM gym_member_shifts ms JOIN gym_shifts s ON s.id = ms.shift_id
      WHERE ms.venue_id = :v AND ms.member_id IN (:ids)`,
    { replacements: { v: venueId, ids } }
  );
  const by = new Map(rows.map((r) => [r.member_id, r]));
  for (const m of arr) {
    const r = by.get(m.id);
    m.shift_id = r ? r.shift_id : null;
    m.shift_name = r ? r.name : null;
    m.shift_start = r ? r.start_time : null;
    m.shift_end = r ? r.end_time : null;
  }
  return members;
}

module.exports = { list, create, update, remove, detail, checkShift, assign, unassign, decorate };