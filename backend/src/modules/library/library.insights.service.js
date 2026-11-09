// Library settings + the owner dashboard numbers.
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const C = require("./library.constants");
const core = require("./library.core");
const { LibSettings, LibHall, LibShift } = require("./library.models");
const books = require("./library.books.service");

/* ---------------- settings ---------------- */
async function getSettings(venueId) {
  const [s] = await LibSettings.findOrCreate({
    where: { venue_id: venueId },
    defaults: { venue_id: venueId, qr_token: U.token(), kiosk_token: U.token() }
  });
  return s;
}

const checkinUrl = (s) => `${U.publicApiBase()}/public/library/checkin/${s.qr_token}`;
const kioskUrl = (s) => `${U.publicApiBase()}/public/library/kiosk/${s.kiosk_token}`;

function publicSettings(s) {
  return {
    qr_enabled: !!s.qr_enabled, qr_mode: s.qr_mode, require_phone: !!s.require_phone, enforce_shift: !!s.enforce_shift,
    grace_minutes: s.grace_minutes, weekly_off: s.weekly_off || [], holidays: s.holidays || [],
    registration_fee: Number(s.registration_fee) || 0, receipt_prefix: s.receipt_prefix,
    loan_days: s.loan_days, max_books: s.max_books, fine_per_day: Number(s.fine_per_day) || 0,
    checkin_url: checkinUrl(s), kiosk_url: kioskUrl(s)
  };
}

async function updateSettings(venueId, b) {
  const s = await getSettings(venueId);
  const up = {};
  if (b.qr_enabled !== undefined) up.qr_enabled = !!b.qr_enabled;
  if (b.qr_mode !== undefined) up.qr_mode = b.qr_mode === "rotating" ? "rotating" : "static";
  if (b.require_phone !== undefined) up.require_phone = !!b.require_phone;
  if (b.enforce_shift !== undefined) up.enforce_shift = !!b.enforce_shift;
  if (b.grace_minutes !== undefined) up.grace_minutes = U.num(b.grace_minutes, "Grace minutes", { min: 0, max: 240, int: true });
  if (b.registration_fee !== undefined) up.registration_fee = U.money(U.num(core.blank(b.registration_fee) ? 0 : b.registration_fee, "Registration fee", { max: 1000000 }));
  if (b.receipt_prefix !== undefined) {
    const p = String(b.receipt_prefix || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
    up.receipt_prefix = p || "LR";
  }
  if (b.loan_days !== undefined) up.loan_days = U.num(b.loan_days, "Loan days", { min: 1, max: 365, int: true });
  if (b.max_books !== undefined) up.max_books = U.num(b.max_books, "Max books", { min: 1, max: 50, int: true });
  if (b.fine_per_day !== undefined) up.fine_per_day = U.money(U.num(core.blank(b.fine_per_day) ? 0 : b.fine_per_day, "Fine per day", { max: 10000 }));
  if (b.weekly_off !== undefined) {
    if (!Array.isArray(b.weekly_off)) throw new AppError("Weekly off days are invalid", 400);
    up.weekly_off = [...new Set(b.weekly_off.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
  }
  if (b.holidays !== undefined) {
    if (!Array.isArray(b.holidays) || b.holidays.length > 200) throw new AppError("Too many holidays", 400);
    const seen = new Map();
    for (const h of b.holidays) {
      const d = h ? String(h.date || "") : "";
      if (!U.isYmd(d)) throw new AppError("A holiday date is invalid", 400);
      seen.set(d, { date: d, name: String((h && h.name) || "").trim().slice(0, 60) });
    }
    up.holidays = [...seen.values()].sort((a, c) => a.date.localeCompare(c.date));
  }
  await s.update(up);
  return publicSettings(s);
}

// Old QR (and kiosk link) stop working. Use if a QR was shared outside the library.
async function regenerateQr(venueId) {
  const s = await getSettings(venueId);
  await s.update({ qr_token: U.token(), kiosk_token: U.token() });
  return publicSettings(s);
}

/* ---------------- dashboard ---------------- */
const num = (v) => Number(v) || 0;

function lastMonthKeys(today, n) {
  const first = `${today.slice(0, 8)}01`;
  return Array.from({ length: n }, (_, i) => U.addMonths(first, i - (n - 1)).slice(0, 7));
}
const monthLabel = (k) => new Date(`${k}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

async function dashboard(venueId, settings) {
  const today = U.todayIST();
  const monthStart = `${today.slice(0, 8)}01`;
  const lastMonthStart = U.addMonths(monthStart, -1);
  const keys = lastMonthKeys(today, 6);
  const from = `${keys[0]}-01`;
  const in7 = U.addDays(today, C.EXPIRING_DAYS);
  const from14 = U.addDays(today, -13);
  const q = (sql, extra = {}) => sequelize.query(sql, {
    replacements: { v: venueId, today, in7, monthStart, lastMonthStart, from, from14, ...extra }, type: QueryTypes.SELECT
  });

  const [
    [st], [col], trendRows, shiftRev, halls, shifts, allocs, [expected], [present], attTrend, expiring, dues, recent
  ] = await Promise.all([
    q(`SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active' AND end_date >= :today)::int AS active,
         COUNT(*) FILTER (WHERE status = 'active' AND end_date BETWEEN :today AND :in7)::int AS expiring,
         COUNT(*) FILTER (WHERE status = 'active' AND end_date < :today)::int AS expired,
         COUNT(*) FILTER (WHERE status = 'frozen')::int AS frozen,
         COUNT(*) FILTER (WHERE status = 'left')::int AS "left",
         COUNT(*) FILTER (WHERE joined_on >= :monthStart AND status <> 'left')::int AS new_this_month,
         COUNT(*) FILTER (WHERE balance_due > 0 AND status <> 'left')::int AS dues_count,
         COALESCE(SUM(balance_due) FILTER (WHERE status <> 'left'), 0)::float AS dues_total
       FROM lib_students WHERE venue_id = :v AND is_archived = false`),
    q(`SELECT COALESCE(SUM(amount) FILTER (WHERE paid_on = :today), 0)::float AS today,
         COALESCE(SUM(amount) FILTER (WHERE paid_on >= :monthStart), 0)::float AS month,
         COALESCE(SUM(amount) FILTER (WHERE paid_on >= :lastMonthStart AND paid_on < :monthStart), 0)::float AS last_month,
         COALESCE(SUM(amount), 0)::float AS lifetime
       FROM lib_payments WHERE venue_id = :v AND status = 'paid'`),
    q(`SELECT to_char(p.paid_on, 'YYYY-MM') AS month, COALESCE(ms.kind, 'other') AS kind, SUM(p.amount)::float AS total
         FROM lib_payments p LEFT JOIN lib_memberships ms ON ms.id = p.membership_id
        WHERE p.venue_id = :v AND p.status = 'paid' AND p.paid_on >= CAST(:from AS date) GROUP BY 1, 2`),
    q(`SELECT COALESCE(ms.shift_name, 'Other') AS shift_name, SUM(p.amount)::float AS total
         FROM lib_payments p LEFT JOIN lib_memberships ms ON ms.id = p.membership_id
        WHERE p.venue_id = :v AND p.status = 'paid' AND p.paid_on >= CAST(:monthStart AS date) GROUP BY 1 ORDER BY 2 DESC LIMIT 8`),
    LibHall.findAll({ where: { venue_id: venueId, is_active: true }, order: [["sort_order", "ASC"], ["name", "ASC"]] }),
    LibShift.findAll({ where: { venue_id: venueId, is_active: true }, order: [["sort_order", "ASC"], ["start_time", "ASC"]] }),
    q(`SELECT a.hall_id, a.seat_no, a.shift_id, sh.start_time, sh.end_time
         FROM lib_allocations a JOIN lib_shifts sh ON sh.id = a.shift_id
         JOIN lib_students s ON s.id = a.student_id AND s.is_archived = false
        WHERE a.venue_id = :v AND a.status = 'active'`),
    q(`SELECT COUNT(DISTINCT s.id)::int AS n
         FROM lib_students s JOIN lib_allocations a ON a.student_id = s.id AND a.status = 'active'
        WHERE s.venue_id = :v AND s.is_archived = false AND s.status = 'active'
          AND EXISTS (SELECT 1 FROM lib_memberships ms WHERE ms.student_id = s.id AND ms.status = 'active'
                        AND ms.start_date <= CAST(:today AS date) AND ms.end_date >= CAST(:today AS date))`),
    q(`SELECT COUNT(*) FILTER (WHERE status = 'present')::int AS present,
         COUNT(*) FILTER (WHERE status = 'present' AND check_in_at IS NOT NULL AND check_out_at IS NULL)::int AS inside
       FROM lib_attendance WHERE venue_id = :v AND att_date = CAST(:today AS date)`),
    q(`SELECT to_char(att_date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS present
         FROM lib_attendance WHERE venue_id = :v AND status = 'present' AND att_date >= CAST(:from14 AS date) GROUP BY 1`),
    q(`SELECT id, name, student_code, phone, end_date, balance_due::float AS balance_due
         FROM lib_students WHERE venue_id = :v AND is_archived = false AND status = 'active' AND end_date BETWEEN :today AND :in7
        ORDER BY end_date ASC LIMIT 8`),
    q(`SELECT id, name, student_code, phone, end_date, balance_due::float AS balance_due
         FROM lib_students WHERE venue_id = :v AND is_archived = false AND status <> 'left' AND balance_due > 0
        ORDER BY balance_due DESC LIMIT 8`),
    q(`SELECT p.id, p.amount::float AS amount, p.mode, p.paid_on, p.receipt_no, s.name AS student_name, s.id AS student_id
         FROM lib_payments p JOIN lib_students s ON s.id = p.student_id
        WHERE p.venue_id = :v AND p.status = 'paid' ORDER BY p.paid_on DESC, p.receipt_seq DESC LIMIT 6`)
  ]);

  // 6-month collection split: new joinings / renewals / other
  const trend = keys.map((k) => {
    const row = { month: monthLabel(k), new: 0, renewal: 0, other: 0 };
    trendRows.filter((r) => r.month === k).forEach((r) => { row[r.kind === "new" || r.kind === "renewal" ? r.kind : "other"] += num(r.total); });
    return row;
  });

  // Seat occupancy. A seat counts as taken for a shift if it is sold to that shift OR an overlapping one.
  const seatCount = (h) => h.seat_end - h.seat_start + 1 - (h.blocked_seats || []).length;
  const totalSeats = halls.reduce((n, h) => n + seatCount(h), 0);
  const activeHallIds = new Set(halls.map((h) => h.id));
  const liveAllocs = allocs.filter((a) => activeHallIds.has(a.hall_id));
  const shiftRows = shifts.map((s) => {
    const taken = new Set();
    liveAllocs.forEach((a) => { if (a.shift_id === s.id || core.shiftsOverlap(s, a)) taken.add(`${a.hall_id}:${a.seat_no}`); });
    const occupied = taken.size;
    return {
      id: s.id, name: s.name, start_time: s.start_time, end_time: s.end_time, price: num(s.price),
      total: totalSeats, occupied, free: Math.max(totalSeats - occupied, 0), percent: totalSeats ? Math.round((occupied / totalSeats) * 100) : 0
    };
  });
  const hallRows = halls.map((h) => ({
    id: h.id, name: h.name, total_seats: seatCount(h),
    seats_used: new Set(liveAllocs.filter((a) => a.hall_id === h.id).map((a) => a.seat_no)).size
  }));
  const capacity = shiftRows.reduce((n, s) => n + s.total, 0);
  const used = shiftRows.reduce((n, s) => n + s.occupied, 0);

  const attMap = new Map(attTrend.map((r) => [r.date, r.present]));
  const attDays = Array.from({ length: 14 }, (_, i) => { const d = U.addDays(from14, i); return { date: d, present: attMap.get(d) || 0 }; });

  return {
    setup: { halls: halls.length, shifts: shifts.length, students: st.total },
    students: st,
    collection: { today: col.today, month: col.month, last_month: col.last_month, lifetime: col.lifetime, trend },
    seats: { total_seats: totalSeats, percent: capacity ? Math.round((used / capacity) * 100) : 0, shifts: shiftRows, halls: hallRows },
    attendance: {
      present_today: num(present.present), inside_now: num(present.inside), expected_today: num(expected.n),
      off_reason: core.offReason(settings, today), trend: attDays
    },
    expiring: expiring.map((r) => ({ ...r, days_left: U.diffDays(today, r.end_date) })),
    dues,
    recent_payments: recent,
    revenue_by_shift: shiftRev,
    books: await books.summary(venueId)

  };
}

module.exports = { getSettings, publicSettings, updateSettings, regenerateQr, dashboard, checkinUrl, kioskUrl };