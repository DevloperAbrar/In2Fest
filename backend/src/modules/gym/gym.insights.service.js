const Razorpay = require("razorpay");
const { Op, QueryTypes } = require("sequelize");
const { sequelize, GymSettings, GymMember, GymPayment, GymLead } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const C = require("./gym.constants");
const core = require("./gym.core");

async function getSettings(venueId) {
  const [s] = await GymSettings.findOrCreate({ where: { venue_id: venueId } });
  return s;
}

function publicSettings(s) {
  const j = s.toJSON();
  delete j.razorpay_key_secret_enc;
  j.razorpay_connected = !!(s.razorpay_key_id && s.razorpay_key_secret_enc);
  j.default_messages = C.DEFAULT_MESSAGES;
  return j;
}



async function updateSettings(venueId, b) {
  const s = await getSettings(venueId);
  const up = {};
  if (b.receipt_prefix !== undefined) {
    const p = String(b.receipt_prefix).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
    if (!p) throw new AppError("Receipt prefix is invalid", 400);
    up.receipt_prefix = p;
  }
  if (b.member_id_mode !== undefined) {
    if (!["sequence", "random"].includes(b.member_id_mode)) throw new AppError("Member ID type is invalid", 400);
    up.member_id_mode = b.member_id_mode;
  }
  if (b.message_templates !== undefined) {
    const t = {};
    C.MESSAGE_KEYS.forEach((k) => {
      const v = b.message_templates && b.message_templates[k];
      if (typeof v === "string" && v.trim()) t[k] = v.trim().slice(0, 800);
    });
    up.message_templates = t;
  }
  if (b.razorpay_disconnect) {
    up.razorpay_key_id = null;
    up.razorpay_key_secret_enc = null;
  } else if (b.razorpay_key_id || b.razorpay_key_secret) {
    const id = String(b.razorpay_key_id || "").trim();
    const secret = String(b.razorpay_key_secret || "").trim();
    if (!/^rzp_(live|test)_[A-Za-z0-9]+$/.test(id) || secret.length < 10) throw new AppError("Enter a valid Razorpay Key ID and Key Secret", 400);
    try {
      await new Razorpay({ key_id: id, key_secret: secret }).paymentLink.all({ count: 1 });
    } catch (e) {
      throw new AppError(`Razorpay rejected these keys: ${(e && e.error && e.error.description) || e.message}`, 400);
    }
    up.razorpay_key_id = id;
    up.razorpay_key_secret_enc = U.encrypt(secret);
  }
  await s.update(up);
  return publicSettings(s);
}

async function dashboard(venueId) {
  const today = U.todayIST();
  const monthStart = `${today.slice(0, 8)}01`;
  const q = (sql, replacements) => sequelize.query(sql, { replacements: { v: venueId, today, ...replacements }, type: QueryTypes.SELECT });

  const [counts] = await q(
    `SELECT
       COUNT(*) FILTER (WHERE status NOT IN ('frozen','cancelled') AND end_date >= :today)::int AS active,
       COUNT(*) FILTER (WHERE status NOT IN ('frozen','cancelled') AND end_date BETWEEN :today AND :in7)::int AS expiring,
       COUNT(*) FILTER (WHERE status NOT IN ('frozen','cancelled') AND end_date < :today)::int AS expired,
       COUNT(*) FILTER (WHERE status = 'frozen')::int AS frozen,
       COUNT(*) FILTER (WHERE balance_due > 0)::int AS dues_count,
       COALESCE(SUM(balance_due), 0)::float AS dues_total,
       COUNT(*) FILTER (WHERE joined_on >= :monthStart)::int AS new_this_month
     FROM gym_members WHERE venue_id = :v AND is_archived = false`,
    { in7: U.addDays(today, C.EXPIRING_DAYS), monthStart }
  );

  const from = U.addMonths(monthStart, -5);
  const monthEnd = U.addDays(U.addMonths(monthStart, 1), -1);

  // Money: counted in the month it was received (paid_on).
  const rev = await q(
    `SELECT to_char(p.paid_on, 'YYYY-MM') AS month, COALESCE(ms.kind, 'other') AS kind, SUM(p.amount)::float AS total
     FROM gym_payments p LEFT JOIN gym_memberships ms ON ms.id = p.membership_id
     WHERE p.venue_id = :v AND p.status = 'paid' AND p.paid_on >= :from GROUP BY 1, 2`,
    { from }
  );
  // Members: counted in the month the membership STARTS, so old / back-dated members land in the right month.
  const moves = await q(
    `SELECT to_char(ms.start_date, 'YYYY-MM') AS month, ms.kind, COUNT(DISTINCT ms.member_id)::int AS n
     FROM gym_memberships ms
     JOIN gym_members gm ON gm.id = ms.member_id AND gm.is_archived = false
     WHERE ms.venue_id = :v AND ms.status = 'active' AND ms.start_date BETWEEN :from AND :monthEnd
     GROUP BY 1, 2`,
    { from, monthEnd }
  );
  // Members who had a running membership on at least one day of each month.
  const running = await q(
    `SELECT to_char(m.month_start, 'YYYY-MM') AS month, COUNT(DISTINCT ms.member_id)::int AS n
     FROM generate_series(CAST(:from AS date), CAST(:monthStart AS date), interval '1 month') AS m(month_start)
     JOIN gym_memberships ms ON ms.venue_id = :v AND ms.status = 'active'
       AND ms.start_date <= CAST(m.month_start + interval '1 month' - interval '1 day' AS date)
       AND ms.end_date >= CAST(m.month_start AS date)
     JOIN gym_members gm ON gm.id = ms.member_id AND gm.is_archived = false
     GROUP BY 1`,
    { from, monthStart }
  );

  const series = [];
  for (let i = 5; i >= 0; i--) series.push({ month: U.addMonths(monthStart, -i).slice(0, 7), new: 0, renewal: 0, other: 0, joined: 0, renewed: 0, active: 0 });
  rev.forEach((r) => {
    const s = series.find((x) => x.month === r.month);
    if (s) s[r.kind === "new" ? "new" : r.kind === "renewal" ? "renewal" : "other"] += r.total;
  });
  moves.forEach((r) => {
    const s = series.find((x) => x.month === r.month);
    if (!s) return;
    if (r.kind === "new") s.joined += r.n;
    else if (r.kind === "renewal") s.renewed += r.n;
  });
  running.forEach((r) => {
    const s = series.find((x) => x.month === r.month);
    if (s) s.active = r.n;
  });
  const sum = (s) => s.new + s.renewal + s.other;

  const [rr] = await q(
    `SELECT COUNT(*)::int AS due,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM gym_memberships n
         WHERE n.member_id = ms.member_id AND n.status = 'active' AND n.id <> ms.id AND n.start_date > ms.start_date))::int AS renewed
     FROM gym_memberships ms
     WHERE ms.venue_id = :v AND ms.status = 'active' AND ms.end_date BETWEEN :from30 AND :yesterday`,
    { from30: U.addDays(today, -30), yesterday: U.addDays(today, -1) }
  );

  const base = { venue_id: venueId, is_archived: false };
  const [expiringList, duesList, pending, newLeads] = await Promise.all([
    GymMember.findAll({ where: { ...base, status: { [Op.notIn]: ["frozen", "cancelled"] }, end_date: { [Op.between]: [today, U.addDays(today, C.EXPIRING_DAYS)] } }, order: [["end_date", "ASC"]], limit: 8 }),
    GymMember.findAll({ where: { ...base, balance_due: { [Op.gt]: 0 } }, order: [["balance_due", "DESC"]], limit: 8 }),
    GymPayment.findAll({ where: { venue_id: venueId, status: "pending" }, order: [["createdAt", "DESC"]], limit: 20, include: [{ model: GymMember, as: "member", attributes: ["id", "name", "phone"] }] }),
    GymLead.count({ where: { venue_id: venueId, status: "new" } })
  ]);

  const [todayRow] = await q(
    `SELECT COALESCE(SUM(amount), 0)::float AS total FROM gym_payments
     WHERE venue_id = :v AND status = 'paid' AND paid_on = :today`
  );

  return {
    counts,
    revenue: { this_month: sum(series[5]), last_month: sum(series[4]), today: Number(todayRow && todayRow.total) || 0 },
    revenue_series: series,
    renewal_rate: rr.due > 0 ? Math.round((rr.renewed / rr.due) * 100) : null,
    renewals_due_30d: rr.due,
    expiring_list: expiringList.map((m) => core.present(m, today)),
    dues_list: duesList.map((m) => core.present(m, today)),
    pending_payments: pending,
    new_leads: newLeads
  };
}

async function listLeads(venueId, q) {
  const where = { venue_id: venueId };
  if (C.LEAD_STATUSES.includes(q.status)) where.status = q.status;
  return GymLead.findAll({ where, order: [["createdAt", "DESC"]], limit: 200 });
}

async function updateLead(venueId, id, b) {
  const lead = await GymLead.findOne({ where: { id, venue_id: venueId } });
  if (!lead) throw new AppError("Lead not found", 404);
  const up = {};
  if (b.status !== undefined) {
    if (!C.LEAD_STATUSES.includes(b.status)) throw new AppError("Invalid status", 400);
    up.status = b.status;
  }
  if (b.notes !== undefined) up.notes = String(b.notes || "").slice(0, 1000) || null;
  if (b.trial_date !== undefined) up.trial_date = b.trial_date && U.isYmd(b.trial_date) ? b.trial_date : null;
  return lead.update(up);
}

module.exports = { getSettings, publicSettings, updateSettings, dashboard, listLeads, updateLead };