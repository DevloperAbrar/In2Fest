// WhatsApp reminders for fee expiry and dues. Messages are prepared here; the owner taps "WhatsApp"
// to send them from their own number (no per-message API cost). Sent reminders are logged so the
// same message is not shown again right away.
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const core = require("./library.core");
const { LibReminder } = require("./library.models");

const KINDS = [
  { key: "d7", label: "Expiring in 5-7 days", test: (d) => d >= 5 && d <= 7, quiet: 3 },
  { key: "d3", label: "Expiring in 2-4 days", test: (d) => d >= 2 && d <= 4, quiet: 2 },
  { key: "d1", label: "Expiring tomorrow", test: (d) => d === 1, quiet: 1 },
  { key: "d0", label: "Expiring today", test: (d) => d === 0, quiet: 1 },
  { key: "expired", label: "Recently expired (15 days)", test: (d) => d < 0 && d >= -15, quiet: 3 }
];
const DUES = { key: "dues", label: "Pending fees", quiet: 5 };
const ALL_KEYS = [...KINDS.map((k) => k.key), DUES.key];

function message(kind, s, lib) {
  const seat = s.hall_name ? ` (${s.hall_name}, Seat ${s.seat_no}${s.shift_name ? `, ${s.shift_name}` : ""})` : "";
  const end = U.fmtDate(s.end_date);
  const head = `Namaste ${s.name},`;
  const tail = `\n- ${lib}`;
  switch (kind) {
    case "d7": case "d3":
      return `${head} ${lib} mein aapki seat${seat} ${end} ko khatam ho rahi hai (${s.days_left} din baaki). Seat banaye rakhne ke liye kripya fees jama karein. Dhanyavaad!${tail}`;
    case "d1":
      return `${head} aapki seat${seat} kal (${end}) khatam ho rahi hai. Kripya fees jama karke renew karein.${tail}`;
    case "d0":
      return `${head} aapki seat${seat} aaj khatam ho rahi hai. Kripya aaj hi renew karein taaki seat bani rahe.${tail}`;
    case "expired":
      return `${head} aapki seat${seat} ${end} ko khatam ho chuki hai. Kripya jald renew karein, warna seat kisi aur ko di ja sakti hai.${tail}`;
    default:
      return `${head} aapki ₹${Number(s.balance_due).toLocaleString("en-IN")} fees baaki hai. Kripya jald jama karein. Dhanyavaad!${tail}`;
  }
}

async function list(ctx) {
  const today = U.todayIST();
  const lib = String(ctx.venue.hall_name || "Library");
  const rows = await sequelize.query(
    `SELECT s.id, s.student_code, s.name, s.phone, s.end_date, s.balance_due::float AS balance_due, s.status,
            h.name AS hall_name, a.seat_no, sh.name AS shift_name
       FROM lib_students s
       LEFT JOIN lib_allocations a ON a.student_id = s.id AND a.status = 'active'
       LEFT JOIN lib_halls h ON h.id = a.hall_id
       LEFT JOIN lib_shifts sh ON sh.id = a.shift_id
      WHERE s.venue_id = :v AND s.is_archived = false AND s.status <> 'left'
        AND (s.balance_due > 0 OR s.end_date BETWEEN CAST(:from AS date) AND CAST(:to AS date))`,
    { replacements: { v: ctx.venue.id, from: U.addDays(today, -15), to: U.addDays(today, 7) }, type: QueryTypes.SELECT }
  );
  const logs = await sequelize.query(
    `SELECT student_id, kind, MAX(sent_on) AS last FROM lib_reminders WHERE venue_id = :v AND sent_on >= CAST(:since AS date) GROUP BY 1, 2`,
    { replacements: { v: ctx.venue.id, since: U.addDays(today, -6) }, type: QueryTypes.SELECT }
  );
  const lastSent = new Map(logs.map((l) => [`${l.student_id}:${l.kind}`, l.last]));
  const recently = (sid, kind, quiet) => {
    const last = lastSent.get(`${sid}:${kind}`);
    return !!last && U.diffDays(last, today) < quiet;
  };

  const groups = [...KINDS, DUES].map((k) => ({ key: k.key, label: k.label, items: [] }));
  const byKey = Object.fromEntries(groups.map((g) => [g.key, g]));
  rows.forEach((r) => {
    const days = r.end_date ? U.diffDays(today, r.end_date) : null;
    const base = { student_id: r.id, name: r.name, code: r.student_code, phone: r.phone, end_date: r.end_date, days_left: days, balance_due: r.balance_due, hall_name: r.hall_name, seat_no: r.seat_no, shift_name: r.shift_name };
    if (r.status === "active" && days !== null) {
      const kind = KINDS.find((k) => k.test(days));
      if (kind && !recently(r.id, kind.key, kind.quiet)) byKey[kind.key].items.push({ ...base, message: message(kind.key, { ...r, days_left: days }, lib) });
    }
    if (r.balance_due > 0 && !recently(r.id, DUES.key, DUES.quiet)) byKey.dues.items.push({ ...base, message: message("dues", r, lib) });
  });
  groups.forEach((g) => g.items.sort((a, b) => String(a.name).localeCompare(b.name)));
  return { groups };
}

async function mark(ctx, b) {
  if (!ALL_KEYS.includes(b.kind)) throw new AppError("Reminder type is invalid", 400);
  const ids = Array.isArray(b.student_ids) ? [...new Set(b.student_ids.filter(core.isUuid))].slice(0, 100) : [];
  if (!ids.length) throw new AppError("Choose at least one student", 400);
  const valid = await sequelize.query(`SELECT id FROM lib_students WHERE venue_id = :v AND id IN (:ids)`, { replacements: { v: ctx.venue.id, ids }, type: QueryTypes.SELECT });
  const by = String((ctx.user && (ctx.user.name || ctx.user.email)) || "Owner").slice(0, 80);
  await LibReminder.bulkCreate(valid.map((s) => ({ venue_id: ctx.venue.id, student_id: s.id, kind: b.kind, sent_on: U.todayIST(), sent_by: by })));
  return { marked: valid.length };
}

module.exports = { list, mark };