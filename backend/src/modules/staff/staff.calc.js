const U = require("../gym/gym.utils");

const STATUSES = ["present", "absent", "half_day", "paid_leave", "holiday"];
const MODES = ["cash", "upi", "bank_transfer", "cheque", "other"];

const isYm = (v) => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const daysIn = (m) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();
const monthStart = (m) => `${m}-01`;
const monthEnd = (m) => `${m}-${String(daysIn(m)).padStart(2, "0")}`;
const weekday = (ymd) => new Date(Date.parse(`${ymd}T00:00:00Z`)).getUTCDay();
const currentMonth = () => U.todayIST().slice(0, 7);

/*
  Rules:
  - Salary is pro-rated by calendar days for the part of the month the person was employed.
  - Weekly off days and holidays are paid. Paid leave is never deducted.
  - Absent = 1 day, half day = 0.5. The first `free_leave_days` of absence per month are free,
    every day after that costs `deduction_per_day`.
  - Unmarked past days count as present (never deducted) and are reported as `unmarked`.
  - Days after today are not judged yet.
  - Net = prorated - attendance deduction + bonus - other deduction, never below 0.
*/
function computeMonth(staff, month, records, adj, today = U.todayIST()) {
  const D = daysIn(month);
  const mStart = monthStart(month);
  const mEnd = monthEnd(month);
  const joined = String(staff.joining_date);
  const left = staff.left_date ? String(staff.left_date) : null;
  const from = joined > mStart ? joined : mStart;
  const to = left && left < mEnd ? left : mEnd;
  const salary = Number(staff.monthly_salary) || 0;
  const rate = Number(staff.deduction_per_day) || 0;
  const freeDays = Number(staff.free_leave_days) || 0;
  const bonus = adj ? Number(adj.bonus) || 0 : 0;
  const other = adj ? Number(adj.other_deduction) || 0 : 0;

  const base = {
    month, days_in_month: D, employed: false, from: null, to: null, eligible_days: 0,
    counts: { present: 0, absent: 0, half_day: 0, paid_leave: 0, holiday: 0, week_off: 0, unmarked: 0, upcoming: 0 },
    absence_units: 0, free_leave_days: freeDays, chargeable_units: 0, deduction_per_day: rate, monthly_salary: salary,
    base_amount: 0, attendance_deduction: 0, bonus, other_deduction: other, adjustment_note: (adj && adj.note) || "", net_amount: 0
  };
  if (from > to) return base;

  const eligible = U.diffDays(from, to) + 1;
  const asOf = today < to ? today : to;
  const off = new Set(Array.isArray(staff.weekly_off_days) ? staff.weekly_off_days : []);
  const byDate = new Map((records || []).map((r) => [String(r.date), r.status]));
  const counts = { ...base.counts };
  for (let d = from; d <= to; d = U.addDays(d, 1)) {
    if (d > asOf) counts.upcoming += 1;
    else if (off.has(weekday(d))) counts.week_off += 1;
    else if (!byDate.has(d)) counts.unmarked += 1;
    else counts[byDate.get(d)] += 1;
  }

  const units = counts.absent + counts.half_day * 0.5;
  const chargeable = Math.max(0, units - freeDays);
  const prorated = eligible >= D ? salary : U.money((salary * eligible) / D);
  const attDed = Math.min(prorated, U.money(chargeable * rate));
  const net = Math.max(0, U.money(prorated - attDed + bonus - other));

  return {
    ...base, employed: true, from, to, eligible_days: eligible, counts, absence_units: units, chargeable_units: chargeable,
    base_amount: prorated, attendance_deduction: attDed, net_amount: net
  };
}

function payStatus(net, paid) {
  if (net <= 0.009 && paid <= 0.009) return "none";
  if (paid <= 0.009) return "unpaid";
  return net - paid > 0.009 ? "partial" : "paid";
}

module.exports = { STATUSES, MODES, isYm, daysIn, monthStart, monthEnd, weekday, currentMonth, computeMonth, payStatus };