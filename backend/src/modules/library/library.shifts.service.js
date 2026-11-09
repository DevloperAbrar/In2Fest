const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const C = require("./library.constants");
const core = require("./library.core");
const { LibShift, LibAllocation } = require("./library.models");

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function fields(b, cur) {
  const o = {};
  if (!cur || b.name !== undefined) {
    const n = core.clean(b.name, 60);
    if (!n) throw new AppError("Shift name is required", 400);
    o.name = n;
  }
  const st = b.start_time !== undefined ? b.start_time : cur && cur.start_time;
  const en = b.end_time !== undefined ? b.end_time : cur && cur.end_time;
  if (!TIME_RE.test(String(st || ""))) throw new AppError("Enter a valid start time", 400);
  if (!TIME_RE.test(String(en || ""))) throw new AppError("Enter a valid end time", 400);
  if (st === en) throw new AppError("Start and end time cannot be the same", 400);
  o.start_time = st;
  o.end_time = en;
  if (!cur || b.price !== undefined) o.price = U.money(U.num(b.price, "Price", { min: 0, max: 1000000 }));
  if (b.is_active !== undefined) o.is_active = !!b.is_active;
  if (b.sort_order !== undefined) o.sort_order = U.num(b.sort_order || 0, "Sort order", { max: 1000, int: true });
  return o;
}

async function assertNameFree(venueId, name, exceptId) {
  const rows = await LibShift.findAll({ where: { venue_id: venueId }, attributes: ["id", "name"] });
  if (rows.some((r) => r.id !== exceptId && r.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    throw new AppError("A shift with this name already exists", 409);
  }
}

// Changing a shift's timings must not create an overlap on a seat that is shared by two students.
async function assertNoSeatConflicts(venueId, shiftId, st, en) {
  const rows = await sequelize.query(
    `SELECT a.hall_id, a.seat_no, a.shift_id, sh.start_time, sh.end_time
       FROM lib_allocations a JOIN lib_shifts sh ON sh.id = a.shift_id
      WHERE a.venue_id = :v AND a.status = 'active'
        AND EXISTS (SELECT 1 FROM lib_allocations x
                     WHERE x.venue_id = :v AND x.status = 'active' AND x.shift_id = :s
                       AND x.hall_id = a.hall_id AND x.seat_no = a.seat_no)`,
    { replacements: { v: venueId, s: shiftId }, type: QueryTypes.SELECT }
  );
  const bySeat = new Map();
  rows.forEach((r) => {
    const k = `${r.hall_id}:${r.seat_no}`;
    if (!bySeat.has(k)) bySeat.set(k, []);
    bySeat.get(k).push(r.shift_id === shiftId ? { ...r, start_time: st, end_time: en } : r);
  });
  for (const list of bySeat.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (core.shiftsOverlap(list[i], list[j])) {
          throw new AppError("These timings overlap another shift on a seat that is already allotted. Move those students first.", 409);
        }
      }
    }
  }
}

async function list(venueId, all) {
  const rows = await sequelize.query(
    `SELECT sh.*, COALESCE(c.n, 0)::int AS student_count
       FROM lib_shifts sh
       LEFT JOIN (SELECT shift_id, COUNT(*) AS n FROM lib_allocations WHERE venue_id = :v AND status = 'active' GROUP BY shift_id) c ON c.shift_id = sh.id
      WHERE sh.venue_id = :v ${all ? "" : "AND sh.is_active = true"}
      ORDER BY sh.sort_order ASC, sh.start_time ASC, sh.name ASC`,
    { replacements: { v: venueId }, type: QueryTypes.SELECT }
  );
  return { items: rows };
}

async function create(venueId, b) {
  const f = fields(b, null);
  if ((await LibShift.count({ where: { venue_id: venueId } })) >= C.LIMITS.shifts) throw new AppError(`You can create up to ${C.LIMITS.shifts} shifts`, 400);
  await assertNameFree(venueId, f.name);
  return LibShift.create({ ...f, venue_id: venueId });
}

async function update(venueId, id, b) {
  const s = await core.loadShift(venueId, id);
  const f = fields(b, s);
  if (f.name) await assertNameFree(venueId, f.name, s.id);
  if (f.start_time !== s.start_time || f.end_time !== s.end_time) await assertNoSeatConflicts(venueId, s.id, f.start_time, f.end_time);
  if (f.is_active === false && (await LibAllocation.count({ where: { shift_id: s.id, status: "active" } }))) {
    throw new AppError("Students are still in this shift. Move them first.", 409);
  }
  return s.update(f);
}

// A shift that was ever used is deactivated (history stays); a never-used shift is deleted.
async function remove(venueId, id) {
  const s = await core.loadShift(venueId, id);
  if (await LibAllocation.count({ where: { shift_id: s.id, status: "active" } })) {
    throw new AppError("Students are still in this shift. Move them first.", 409);
  }
  if (await LibAllocation.count({ where: { shift_id: s.id } })) {
    await s.update({ is_active: false });
    return { archived: true };
  }
  await s.destroy();
  return { deleted: true };
}

module.exports = { list, create, update, remove };