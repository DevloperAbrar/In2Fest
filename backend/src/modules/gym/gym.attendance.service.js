// Gym member attendance: day register, off days / holidays, analytics and the gym QR check-in.
const { Op, QueryTypes } = require("sequelize");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const { sequelize } = require("../../config/database");
const { Venue, GymMember, GymMembership } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const core = require("./gym.core");
const { gymIdentity } = require("./gym.brand");
const { GymAttendance, GymAttendanceSettings } = require("./gym.attendance.models");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LIST_LIMIT = 1500;
const MAX_SPAN_DAYS = 92;

const realDate = (v) => U.isYmd(v) && U.addDays(v, 0) === v;
const dow = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();
const round1 = (n) => Math.round(n * 10) / 10;
const run = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

// Members whose membership covers the day :d
const COVERED = `EXISTS (SELECT 1 FROM gym_memberships ms WHERE ms.member_id = m.id AND ms.status = 'active'
  AND ms.start_date <= CAST(:d AS date) AND ms.end_date >= CAST(:d AS date))`;

/* ===================== settings ===================== */
async function getSettings(venueId) {
  const [s] = await GymAttendanceSettings.findOrCreate({ where: { venue_id: venueId }, defaults: { venue_id: venueId, qr_token: U.token() } });
  return s;
}
const checkinUrl = (s) => `${U.publicApiBase()}/public/gym/checkin/${s.qr_token}`;

function presentSettings(s) {
  return {
    weekly_off: s.weekly_off || [], holidays: s.holidays || [],
    qr_enabled: !!s.qr_enabled, require_phone: !!s.require_phone, checkin_url: checkinUrl(s)
  };
}

async function publicSettings(venueId) {
  return presentSettings(await getSettings(venueId));
}

async function updateSettings(venueId, b) {
  const s = await getSettings(venueId);
  const up = {};
  if (b.weekly_off !== undefined) {
    if (!Array.isArray(b.weekly_off)) throw new AppError("Weekly off days are invalid", 400);
    up.weekly_off = [...new Set(b.weekly_off.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
  }
  if (b.holidays !== undefined) {
    if (!Array.isArray(b.holidays) || b.holidays.length > 200) throw new AppError("Too many holidays", 400);
    const seen = new Map();
    for (const h of b.holidays) {
      const d = h ? String(h.date || "") : "";
      if (!realDate(d)) throw new AppError("A holiday date is invalid", 400);
      seen.set(d, { date: d, name: String((h && h.name) || "").trim().slice(0, 60) });
    }
    up.holidays = [...seen.values()].sort((a, c) => a.date.localeCompare(c.date));
  }
  if (b.qr_enabled !== undefined) up.qr_enabled = !!b.qr_enabled;
  if (b.require_phone !== undefined) up.require_phone = !!b.require_phone;
  await s.update(up);
  return presentSettings(s);
}

// Old poster stops working. Use if the QR was shared outside the gym.
async function regenerateQr(venueId) {
  const s = await getSettings(venueId);
  await s.update({ qr_token: U.token() });
  return presentSettings(s);
}

// null = gym is open that day, otherwise the reason ("Sunday off" or the holiday name)
function offReason(settings, ymd) {
  const hol = (settings.holidays || []).find((h) => h.date === ymd);
  if (hol) return hol.name || "Holiday";
  const w = dow(ymd);
  if ((settings.weekly_off || []).includes(w)) return `${DAY_NAMES[w]} off`;
  return null;
}

function checkDay(v) {
  if (!realDate(v)) throw new AppError("Choose a valid date", 400);
  const today = U.todayIST();
  if (v > today) throw new AppError("You cannot mark attendance for a future date", 400);
  if (U.diffDays(v, today) > 365) throw new AppError("That date is too old", 400);
  return v;
}

/* ===================== register (one day) ===================== */
async function day(venueId, date) {
  const d = checkDay(date || U.todayIST());
  const settings = await getSettings(venueId);
  const rows = await run(
    `SELECT m.id, m.name, m.member_code, m.phone, m.photo_url, m.plan_name, m.status AS member_status,
            a.status AS att_status, a.check_in_at, a.source, a.marked_by
       FROM gym_members m
       LEFT JOIN gym_attendance a ON a.member_id = m.id AND a.att_date = CAST(:d AS date)
      WHERE m.venue_id = :v AND m.is_archived = false AND (a.id IS NOT NULL OR ${COVERED})
      ORDER BY m.name ASC
      LIMIT ${LIST_LIMIT + 1}`,
    { v: venueId, d }
  );
  const truncated = rows.length > LIST_LIMIT;
  const items = truncated ? rows.slice(0, LIST_LIMIT) : rows;
  const present = items.filter((r) => r.att_status === "present").length;
  const absent = items.filter((r) => r.att_status === "absent").length;
  return {
    date: d, today: U.todayIST(), off_reason: offReason(settings, d), truncated, items,
    summary: { total: items.length, present, absent, unmarked: items.length - present - absent }
  };
}

async function mark({ venue, user }, b) {
  const date = checkDay((b && b.date) || U.todayIST());
  if (!b || !["present", "absent", "clear"].includes(b.status)) throw new AppError("Invalid status", 400);
  if (!UUID_RE.test(String(b.member_id))) throw new AppError("Member not found", 404);
  const member = await core.findMember(venue.id, b.member_id);
  const where = { venue_id: venue.id, member_id: member.id, att_date: date };
  if (b.status === "clear") {
    await GymAttendance.destroy({ where });
    return { member_id: member.id, status: null };
  }
  const by = user && user.name ? String(user.name).slice(0, 80) : null;
  const isToday = date === U.todayIST();
  const apply = (row) => {
    const patch = { status: b.status };
    if (b.status === "present") {
      if (row.status !== "present") Object.assign(patch, { source: "manual", marked_by: by, check_in_at: isToday ? new Date() : null });
    } else {
      Object.assign(patch, { source: "manual", marked_by: by, check_in_at: null });
    }
    return row.update(patch);
  };
  let row = await GymAttendance.findOne({ where });
  if (row) row = await apply(row);
  else {
    try {
      row = await GymAttendance.create({ ...where, status: b.status, source: "manual", marked_by: by, check_in_at: b.status === "present" && isToday ? new Date() : null });
    } catch (e) {
      if (e.name !== "SequelizeUniqueConstraintError") throw e;
      row = await apply(await GymAttendance.findOne({ where })); // two staff tapped at the same moment
    }
  }
  return { member_id: member.id, status: row.status, check_in_at: row.check_in_at, source: row.source };
}

// Marks everyone who has no mark yet for that day. Frozen / cancelled members are skipped.
async function markAll({ venue, user }, b) {
  const date = checkDay((b && b.date) || U.todayIST());
  if (!b || !["present", "absent"].includes(b.status)) throw new AppError("Invalid status", 400);
  const rows = await run(
    `SELECT m.id FROM gym_members m
      WHERE m.venue_id = :v AND m.is_archived = false AND m.status NOT IN ('frozen', 'cancelled') AND ${COVERED}
        AND NOT EXISTS (SELECT 1 FROM gym_attendance a WHERE a.member_id = m.id AND a.att_date = CAST(:d AS date))`,
    { v: venue.id, d: date }
  );
  if (!rows.length) return { marked: 0 };
  const by = user && user.name ? String(user.name).slice(0, 80) : null;
  const now = new Date();
  const stamp = b.status === "present" && date === U.todayIST() ? now : null;
  await GymAttendance.bulkCreate(
    rows.map((r) => ({ venue_id: venue.id, member_id: r.id, att_date: date, status: b.status, source: "manual", marked_by: by, check_in_at: stamp })),
    { ignoreDuplicates: true }
  );
  return { marked: rows.length };
}

/* ===================== one member, one month ===================== */
// Calendar data for a single member: every day of the month with its mark, whether the gym was
// closed, and whether the member had a running membership on that day.
async function memberMonth(venueId, memberId, q) {
  if (!UUID_RE.test(String(memberId))) throw new AppError("Member not found", 404);
  const member = await core.findMember(venueId, memberId);
  const today = U.todayIST();
  const thisMonth = today.slice(0, 7);
  const asked = q && typeof q.month === "string" ? q.month : "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) ? asked : thisMonth;
  if (month > thisMonth) throw new AppError("Choose a month that is not in the future", 400);

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = `${month}-01`;
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;
  const settings = await getSettings(venueId);

  const [rows, spans, totals] = await Promise.all([
    run(
      `SELECT to_char(att_date, 'YYYY-MM-DD') AS d, status, check_in_at, source, marked_by
         FROM gym_attendance
        WHERE venue_id = :v AND member_id = :m AND att_date BETWEEN CAST(:f AS date) AND CAST(:t AS date)`,
      { v: venueId, m: member.id, f: from, t: to }
    ),
    run(
      `SELECT to_char(start_date, 'YYYY-MM-DD') AS s, to_char(end_date, 'YYYY-MM-DD') AS e
         FROM gym_memberships
        WHERE member_id = :m AND status = 'active' AND start_date <= CAST(:t AS date) AND end_date >= CAST(:f AS date)`,
      { m: member.id, f: from, t: to }
    ),
    run(
      `SELECT to_char(MAX(att_date) FILTER (WHERE status = 'present'), 'YYYY-MM-DD') AS last_visit,
              COUNT(*) FILTER (WHERE status = 'present') AS visits
         FROM gym_attendance WHERE venue_id = :v AND member_id = :m`,
      { v: venueId, m: member.id }
    )
  ]);

  const byDate = new Map(rows.map((r) => [r.d, r]));
  const covered = (ymd) => spans.some((s) => s.s <= ymd && s.e >= ymd);
  const days = [];
  let present = 0;
  let absentMarked = 0;
  let notMarked = 0;
  for (let i = 1; i <= lastDay; i += 1) {
    const date = `${month}-${String(i).padStart(2, "0")}`;
    const row = byDate.get(date) || null;
    const future = date > today;
    const off = offReason(settings, date);
    const inPlan = covered(date);
    if (row && row.status === "present") present += 1;
    else if (row && row.status === "absent") absentMarked += 1;
    else if (!row && inPlan && !off && !future) notMarked += 1;
    days.push({
      date,
      status: row ? row.status : null,
      check_in_at: row ? row.check_in_at : null,
      source: row ? row.source : null,
      marked_by: row ? row.marked_by : null,
      off,
      covered: inPlan,
      future
    });
  }
  const counted = present + absentMarked + notMarked;
  const t = totals[0] || {};
  return {
    member: {
      id: member.id, name: member.name, member_code: member.member_code, phone: member.phone,
      photo_url: member.photo_url, plan_name: member.plan_name, status: member.status
    },
    month,
    today,
    days,
    summary: {
      present, absent_marked: absentMarked, not_marked: notMarked,
      absent: absentMarked + notMarked,
      rate: counted ? Math.round((present / counted) * 100) : null
    },
    last_visit: t.last_visit || null,
    total_visits: Number(t.visits || 0)
  };
}

/* ===================== analytics ===================== */
async function analytics(venueId, q) {
  const settings = await getSettings(venueId);
  const today = U.todayIST();
  let to = realDate(q.to) ? q.to : today;
  if (to > today) to = today;
  let from = realDate(q.from) ? q.from : `${today.slice(0, 8)}01`;
  if (from > to) throw new AppError("The start date is after the end date", 400);
  if (U.diffDays(from, to) > MAX_SPAN_DAYS) throw new AppError("Choose a period of up to 3 months", 400);
  const inactiveDays = Math.min(Math.max(parseInt(q.inactive_days, 10) || 7, 3), 60);
  const r = { v: venueId, from, to };

  const [dailyRows, expectedRows, hourRows, regulars, uniq, snap, first] = await Promise.all([
    run(`SELECT to_char(att_date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n FROM gym_attendance
          WHERE venue_id = :v AND status = 'present' AND att_date BETWEEN CAST(:from AS date) AND CAST(:to AS date) GROUP BY 1`, r),
    run(`SELECT to_char(g.d, 'YYYY-MM-DD') AS day, COUNT(DISTINCT ms.member_id)::int AS n
           FROM generate_series(CAST(:from AS date), CAST(:to AS date), interval '1 day') AS g(d)
           JOIN gym_memberships ms ON ms.venue_id = :v AND ms.status = 'active' AND ms.start_date <= g.d AND ms.end_date >= g.d
           JOIN gym_members m ON m.id = ms.member_id AND m.is_archived = false
          GROUP BY 1`, r),
    run(`SELECT EXTRACT(HOUR FROM (check_in_at AT TIME ZONE 'Asia/Kolkata'))::int AS h, COUNT(*)::int AS n FROM gym_attendance
          WHERE venue_id = :v AND status = 'present' AND check_in_at IS NOT NULL
            AND att_date BETWEEN CAST(:from AS date) AND CAST(:to AS date) GROUP BY 1`, r),
    run(`SELECT m.id, m.name, m.member_code, m.phone, COUNT(*)::int AS days
           FROM gym_attendance a JOIN gym_members m ON m.id = a.member_id
          WHERE a.venue_id = :v AND a.status = 'present' AND m.is_archived = false
            AND a.att_date BETWEEN CAST(:from AS date) AND CAST(:to AS date)
          GROUP BY m.id ORDER BY days DESC, m.name ASC LIMIT 10`, r),
    run(`SELECT COUNT(DISTINCT member_id)::int AS n FROM gym_attendance
          WHERE venue_id = :v AND status = 'present' AND att_date BETWEEN CAST(:from AS date) AND CAST(:to AS date)`, r),
    run(`SELECT (SELECT COUNT(*) FROM gym_attendance WHERE venue_id = :v AND att_date = CAST(:today AS date) AND status = 'present')::int AS present,
                (SELECT COUNT(DISTINCT ms.member_id) FROM gym_memberships ms JOIN gym_members m ON m.id = ms.member_id AND m.is_archived = false
                  WHERE ms.venue_id = :v AND ms.status = 'active' AND ms.start_date <= CAST(:today AS date) AND ms.end_date >= CAST(:today AS date))::int AS expected`,
      { v: venueId, today }),
    run(`SELECT to_char(MIN(att_date), 'YYYY-MM-DD') AS d FROM gym_attendance WHERE venue_id = :v`, { v: venueId })
  ]);

  const presentBy = new Map(dailyRows.map((x) => [x.day, x.n]));
  const expectedBy = new Map(expectedRows.map((x) => [x.day, x.n]));
  let working = 0, presentWorking = 0, expectedWorking = 0, total = 0;
  const wd = Array.from({ length: 7 }, () => ({ sum: 0, days: 0 }));
  const days = [];
  for (let d = from; d <= to; d = U.addDays(d, 1)) {
    const off = offReason(settings, d);
    const present = presentBy.get(d) || 0;
    const expected = expectedBy.get(d) || 0;
    total += present;
    if (!off) {
      working += 1; presentWorking += present; expectedWorking += expected;
      wd[dow(d)].sum += present; wd[dow(d)].days += 1;
    }
    days.push({ date: d, present, expected, off });
  }

  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  hourRows.forEach((x) => { if (x.h >= 0 && x.h < 24) hours[x.h].count = x.n; });
  const peak = hours.reduce((a, b) => (b.count > a.count ? b : a), { hour: -1, count: 0 });

  // Members not seen lately. Only meaningful once attendance has been in use for that long.
  const cut = U.addDays(today, -(inactiveDays - 1));
  const startedOn = first[0] && first[0].d;
  const trackingReady = !!startedOn && startedOn <= cut;
  const inactive = trackingReady ? await run(
    `SELECT m.id, m.name, m.member_code, m.phone, m.photo_url, to_char(MAX(a.att_date), 'YYYY-MM-DD') AS last_visit
       FROM gym_members m
       LEFT JOIN gym_attendance a ON a.member_id = m.id AND a.status = 'present'
      WHERE m.venue_id = :v AND m.is_archived = false AND m.status NOT IN ('frozen', 'cancelled')
        AND (m.joined_on IS NULL OR m.joined_on <= CAST(:cut AS date))
        AND EXISTS (SELECT 1 FROM gym_memberships ms WHERE ms.member_id = m.id AND ms.status = 'active'
                     AND ms.start_date <= CAST(:today AS date) AND ms.end_date >= CAST(:today AS date))
      GROUP BY m.id
     HAVING MAX(a.att_date) IS NULL OR MAX(a.att_date) < CAST(:cut AS date)
      ORDER BY MAX(a.att_date) ASC NULLS FIRST, m.name ASC
      LIMIT 30`,
    { v: venueId, cut, today }
  ) : [];

  return {
    from, to, today, tracking_started: !!startedOn,
    summary: {
      total_checkins: total, working_days: working, present_working: presentWorking, expected_working: expectedWorking,
      rate: expectedWorking > 0 ? round1(Math.min(presentWorking / expectedWorking, 1) * 100) : null,
      avg_per_day: working > 0 ? round1(presentWorking / working) : 0,
      unique_members: uniq[0] ? uniq[0].n : 0,
      peak_hour: peak.count > 0 ? peak.hour : null
    },
    today_snapshot: snap[0] || { present: 0, expected: 0 },
    days, hours,
    weekdays: wd.map((x, i) => ({ dow: i, name: DAY_NAMES[i], avg: x.days ? round1(x.sum / x.days) : 0 })),
    regulars, inactive, inactive_days: inactiveDays, inactive_ready: trackingReady
  };
}

/* ===================== QR poster ===================== */
async function qrPng(venueId) {
  const s = await getSettings(venueId);
  return QRCode.toBuffer(checkinUrl(s), { width: 900, margin: 2, errorCorrectionLevel: "M" });
}

async function posterPdf(venue, res) {
  const s = await getSettings(venue.id);
  const url = checkinUrl(s);
  const [png, id] = await Promise.all([
    QRCode.toBuffer(url, { width: 900, margin: 1, errorCorrectionLevel: "M" }),
    gymIdentity(venue)
  ]);
  const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: `Attendance QR - ${id.name}`, Author: id.name } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="attendance-qr-poster.pdf"');
  doc.pipe(res);
  const W = doc.page.width;

  doc.rect(0, 0, W, 170).fill("#0b1b3a");
  let nameX = 40;
  let nameW = W - 80;
  if (id.logo) {
    try {
      doc.save().roundedRect(40, 45, 80, 80, 14).fill("#ffffff").restore();
      doc.image(id.logo, 46, 51, { fit: [68, 68], align: "center", valign: "center" });
      nameX = 140;
      nameW = W - 180;
    } catch (e) { nameX = 40; nameW = W - 80; }
  }
  const name = String(id.name || "Your Gym");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(name.length > 26 ? 26 : 34)
    .text(name, nameX, 62, { width: nameW, height: 70, ellipsis: true, align: nameX === 40 ? "center" : "left" });

  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(30).text("SCAN TO MARK YOUR ATTENDANCE", 40, 200, { width: W - 80, align: "center" });
  doc.fillColor("#475569").font("Helvetica").fontSize(15).text("Hazri lagane ke liye scan karein", 40, 240, { width: W - 80, align: "center" });

  const size = 320;
  const qx = (W - size) / 2;
  const qy = 285;
  doc.roundedRect(qx - 18, qy - 18, size + 36, size + 36, 20).lineWidth(3).strokeColor("#0b1b3a").stroke();
  doc.image(png, qx, qy, { width: size, height: size });

  const steps = [
    ["1", "Open your phone camera and scan this QR code"],
    ["2", "Type your Member ID (example: M0012)"],
    ["3", "Tap  MARK ATTENDANCE  - done!"]
  ];
  let y = qy + size + 45;
  steps.forEach(([n, t]) => {
    doc.circle(90, y + 11, 15).fill("#16a34a");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text(n, 75, y + 5, { width: 30, align: "center" });
    doc.fillColor("#0f172a").font("Helvetica").fontSize(17).text(t, 125, y + 3, { width: W - 170 });
    y += 40;
  });
  doc.fillColor("#94a3b8").font("Helvetica").fontSize(9).text(url, 40, 805, { width: W - 80, align: "center" });
  doc.end();
}

/* ===================== public QR check-in ===================== */
async function findByToken(token) {
  if (!token || !/^[A-Za-z0-9_-]{10,60}$/.test(String(token))) return null;
  const settings = await GymAttendanceSettings.findOne({ where: { qr_token: String(token) } });
  const venue = settings ? await Venue.findOne({ where: { id: settings.venue_id, is_active: true } }) : null;
  return settings && venue ? { settings, venue } : null;
}

// "M0012", "m12", "12" => member code. 10-digit mobile => phone.
function normalizeId(raw) {
  const s = String(raw || "").replace(/[\s\-+]/g, "").toUpperCase();
  const digits = s.replace(/\D/g, "");
  if (/^\d+$/.test(s)) {
    if (digits.length === 10) return { phone: digits };
    if (digits.length === 12 && digits.startsWith("91")) return { phone: digits.slice(2) };
    if (digits.length === 11 && digits.startsWith("0")) return { phone: digits.slice(1) };
  }
  const m = s.match(/^M?(\d{1,6})$/);
  return m ? { code: `M${m[1].padStart(4, "0")}` } : null;
}

// Returns { code, ... }. code: not_found | disabled | closed | bad_id | no_member | frozen | expired | not_started | already | ok
async function checkIn(token, input) {
  const gate = await findByToken(token);
  if (!gate) return { code: "not_found" };
  const { settings, venue } = gate;
  const base = { venue, settings };
  if (!settings.qr_enabled) return { ...base, code: "disabled" };
  const today = U.todayIST();
  const off = offReason(settings, today);
  if (off) return { ...base, code: "closed", reason: off };

  const key = normalizeId(input && input.id);
  if (!key) return { ...base, code: "bad_id" };
  let member;
  if (key.phone) {
    const matches = await GymMember.findAll({ where: { venue_id: venue.id, is_archived: false, phone: key.phone }, limit: 2 });
    // same mobile on more than one member: do not guess, ask for the Member ID
    if (matches.length > 1) return { ...base, code: "bad_id", shared_phone: true };
    member = matches[0] || null;
  } else {
    member = await GymMember.findOne({ where: { venue_id: venue.id, is_archived: false, member_code: key.code } });
  }
  if (!member) return { ...base, code: "no_member" };
  if (settings.require_phone && !key.phone) {
    const last4 = String((input && input.last4) || "").replace(/\D/g, "");
    if (last4.length !== 4 || !String(member.phone).endsWith(last4)) return { ...base, code: "no_member" }; // same answer, reveals nothing
  }
  if (member.status === "frozen") return { ...base, code: "frozen", member };

  const ms = await GymMembership.findOne({
    where: { member_id: member.id, status: "active", start_date: { [Op.lte]: today }, end_date: { [Op.gte]: today } },
    order: [["end_date", "DESC"]]
  });
  if (!ms) {
    const latest = await GymMembership.findOne({ where: { member_id: member.id, status: "active" }, order: [["end_date", "DESC"]] });
    if (latest && latest.start_date > today) return { ...base, code: "not_started", member, date: latest.start_date };
    return { ...base, code: "expired", member, date: latest ? latest.end_date : null };
  }

  const where = { venue_id: venue.id, member_id: member.id, att_date: today };
  const now = new Date();
  const done = (row) => ({ ...base, code: "already", member, ms, at: row.check_in_at });
  let row = await GymAttendance.findOne({ where });
  if (row && row.status === "present") return done(row);
  if (row) await row.update({ status: "present", check_in_at: now, source: "qr", marked_by: null });
  else {
    try {
      row = await GymAttendance.create({ ...where, status: "present", check_in_at: now, source: "qr" });
    } catch (e) {
      if (e.name !== "SequelizeUniqueConstraintError") throw e;
      return done(await GymAttendance.findOne({ where })); // scanned twice at the same moment
    }
  }
  return { ...base, code: "ok", member, ms, at: now, daysLeft: U.diffDays(today, ms.end_date) };
}

module.exports = {
  getSettings, publicSettings, updateSettings, regenerateQr, day, mark, markAll, memberMonth, analytics, qrPng, posterPdf, findByToken, checkIn
};