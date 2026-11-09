const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const C = require("./library.constants");
const core = require("./library.core");
const { LibHall, LibAllocation } = require("./library.models");

const totalSeats = (h) => h.seat_end - h.seat_start + 1 - (h.blocked_seats || []).length;

function parseBlocked(v, start, end) {
  const list = Array.isArray(v) ? v : String(v ?? "").split(/[,\s]+/);
  const set = new Set();
  for (const raw of list) {
    if (core.blank(raw)) continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < start || n > end) throw new AppError(`Blocked seat "${raw}" is outside the hall's seat range`, 400);
    set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

// `cur` is the existing hall when updating.
function fields(b, cur) {
  const o = {};
  if (!cur || b.name !== undefined) {
    const n = core.clean(b.name, 60);
    if (!n) throw new AppError("Hall name is required", 400);
    o.name = n;
  }
  const start = !core.blank(b.seat_start) ? U.num(b.seat_start, "Start seat", { min: 1, max: 9999, int: true }) : cur ? cur.seat_start : 1;
  let end;
  if (!core.blank(b.seat_end)) end = U.num(b.seat_end, "End seat", { min: 1, max: 9999, int: true });
  else if (!core.blank(b.capacity)) end = start + U.num(b.capacity, "Capacity", { min: 1, max: C.LIMITS.seatsPerHall, int: true }) - 1;
  else if (cur) end = cur.seat_end;
  else throw new AppError("Enter the end seat or choose a capacity", 400);
  if (end < start) throw new AppError("End seat must be the same as or after the start seat", 400);
  if (end - start + 1 > C.LIMITS.seatsPerHall) throw new AppError(`A hall can have up to ${C.LIMITS.seatsPerHall} seats`, 400);
  o.seat_start = start;
  o.seat_end = end;
  if (!core.blank(b.seats_per_row)) o.seats_per_row = U.num(b.seats_per_row, "Seats per row", { min: 1, max: 30, int: true });
  o.blocked_seats = b.blocked_seats !== undefined
    ? parseBlocked(b.blocked_seats, start, end)
    : ((cur && cur.blocked_seats) || []).filter((n) => n >= start && n <= end);
  if (b.is_active !== undefined) o.is_active = !!b.is_active;
  if (b.sort_order !== undefined) o.sort_order = U.num(b.sort_order || 0, "Sort order", { max: 1000, int: true });
  return o;
}

async function assertNameFree(venueId, name, exceptId) {
  const rows = await LibHall.findAll({ where: { venue_id: venueId }, attributes: ["id", "name"] });
  if (rows.some((r) => r.id !== exceptId && r.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    throw new AppError("A hall with this name already exists", 409);
  }
}

async function list(venueId, all) {
  const rows = await sequelize.query(
    `SELECT h.*, COALESCE(a.students, 0)::int AS student_count, COALESCE(a.seats, 0)::int AS occupied_seats
       FROM lib_halls h
       LEFT JOIN (SELECT hall_id, COUNT(*) AS students, COUNT(DISTINCT seat_no) AS seats
                    FROM lib_allocations WHERE venue_id = :v AND status = 'active' GROUP BY hall_id) a ON a.hall_id = h.id
      WHERE h.venue_id = :v ${all ? "" : "AND h.is_active = true"}
      ORDER BY h.sort_order ASC, h.name ASC`,
    { replacements: { v: venueId }, type: QueryTypes.SELECT }
  );
  return { items: rows.map((h) => ({ ...h, total_seats: totalSeats(h) })) };
}

async function create(venueId, b) {
  const f = fields(b, null);
  if ((await LibHall.count({ where: { venue_id: venueId } })) >= C.LIMITS.halls) throw new AppError(`You can create up to ${C.LIMITS.halls} halls`, 400);
  await assertNameFree(venueId, f.name);
  const h = await LibHall.create({ ...f, venue_id: venueId });
  return { ...h.toJSON(), total_seats: totalSeats(h), student_count: 0, occupied_seats: 0 };
}

async function update(venueId, id, b) {
  const h = await core.loadHall(venueId, id);
  const f = fields(b, h);
  if (f.name) await assertNameFree(venueId, f.name, h.id);
  // Never shrink or block a seat that a student is sitting in.
  const used = await LibAllocation.findAll({ where: { hall_id: h.id, status: "active" }, attributes: ["seat_no"], group: ["seat_no"] });
  const bad = used.map((a) => a.seat_no).filter((n) => n < f.seat_start || n > f.seat_end || f.blocked_seats.includes(n));
  if (bad.length) throw new AppError(`Seat ${bad.slice(0, 5).join(", ")} still has students. Move them first.`, 409);
  if (f.is_active === false && used.length) throw new AppError("This hall still has students. Move them first.", 409);
  await h.update(f);
  return { ...h.toJSON(), total_seats: totalSeats(h) };
}

// A hall that was ever used is deactivated (history stays); a never-used hall is deleted.
async function remove(venueId, id) {
  const h = await core.loadHall(venueId, id);
  if (await LibAllocation.count({ where: { hall_id: h.id, status: "active" } })) {
    throw new AppError("This hall still has students. Move them first.", 409);
  }
  if (await LibAllocation.count({ where: { hall_id: h.id } })) {
    await h.update({ is_active: false });
    return { archived: true };
  }
  await h.destroy();
  return { deleted: true };
}

// Seat grid for one hall. With a shift: free | occupied | conflict (sold through an overlapping shift) | blocked.
async function seatmap(venueId, id, shiftId) {
  const hall = await core.loadHall(venueId, id);
  const shift = shiftId ? await core.loadShift(venueId, shiftId) : null;
  const rows = await sequelize.query(
    `SELECT a.seat_no, a.shift_id, sh.name AS shift_name, sh.start_time, sh.end_time,
            s.id AS student_id, s.name, s.student_code, s.photo_url, s.end_date, s.status
       FROM lib_allocations a
       JOIN lib_shifts sh ON sh.id = a.shift_id
       JOIN lib_students s ON s.id = a.student_id
      WHERE a.venue_id = :v AND a.hall_id = :h AND a.status = 'active'`,
    { replacements: { v: venueId, h: hall.id }, type: QueryTypes.SELECT }
  );
  const bySeat = new Map();
  rows.forEach((r) => { if (!bySeat.has(r.seat_no)) bySeat.set(r.seat_no, []); bySeat.get(r.seat_no).push(r); });
  const blocked = new Set(hall.blocked_seats || []);
  const today = U.todayIST();

  const seats = [];
  for (let n = hall.seat_start; n <= hall.seat_end; n++) {
    if (blocked.has(n)) { seats.push({ no: n, state: "blocked" }); continue; }
    const list = bySeat.get(n) || [];
    let state = "free";
    let who = null;
    if (shift) {
      const same = list.find((r) => r.shift_id === shift.id);
      const over = same || list.find((r) => core.shiftsOverlap(shift, r));
      if (over) { state = same ? "occupied" : "conflict"; who = over; }
    } else if (list.length) { state = "occupied"; who = list[0]; }
    seats.push({
      no: n,
      state,
      student: who ? {
        id: who.student_id, name: who.name, code: who.student_code, photo_url: who.photo_url, shift_name: who.shift_name,
        end_date: who.end_date, expired: !!who.end_date && who.end_date < today, frozen: who.status === "frozen"
      } : null,
      other_shifts: list.filter((r) => !who || r.shift_id !== who.shift_id).map((r) => r.shift_name)
    });
  }
  return { hall: { ...hall.toJSON(), total_seats: totalSeats(hall) }, shift: shift ? shift.toJSON() : null, seats };
}

module.exports = { list, create, update, remove, seatmap };