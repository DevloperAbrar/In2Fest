// Public, privacy-safe seat availability for the marketplace profile.
// Exact occupancy is never shown: only "available", "few left" (with the count) or "full".
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const core = require("./library.core");
const { LibHall, LibShift } = require("./library.models");

async function shifts(venueId) {
  const [halls, shiftRows, allocs] = await Promise.all([
    LibHall.findAll({ where: { venue_id: venueId, is_active: true } }),
    LibShift.findAll({ where: { venue_id: venueId, is_active: true }, order: [["sort_order", "ASC"], ["start_time", "ASC"]], limit: 12 }),
    sequelize.query(
      `SELECT a.hall_id, a.seat_no, a.shift_id, sh.start_time, sh.end_time
         FROM lib_allocations a JOIN lib_shifts sh ON sh.id = a.shift_id
        WHERE a.venue_id = :v AND a.status = 'active'`,
      { replacements: { v: venueId }, type: QueryTypes.SELECT }
    )
  ]);
  if (!shiftRows.length || !halls.length) return null;

  const hallIds = new Set(halls.map((h) => h.id));
  const total = halls.reduce((n, h) => n + (h.seat_end - h.seat_start + 1 - (h.blocked_seats || []).length), 0);
  const live = allocs.filter((a) => hallIds.has(a.hall_id));

  return {
    type: "library_shifts",
    total_seats: total,
    halls: halls.length,
    shifts: shiftRows.map((s) => {
      const taken = new Set();
      live.forEach((a) => { if (a.shift_id === s.id || core.shiftsOverlap(s, a)) taken.add(`${a.hall_id}:${a.seat_no}`); });
      const free = Math.max(total - taken.size, 0);
      return {
        id: s.id, name: s.name, start_time: s.start_time, end_time: s.end_time, price: Number(s.price) || 0,
        availability: free === 0 ? "full" : free <= 10 ? "few" : "available",
        free: free > 0 && free <= 10 ? free : null
      };
    })
  };
}

module.exports = { shifts };