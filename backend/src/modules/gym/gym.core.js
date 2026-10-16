const { sequelize, GymPlan, GymMember, GymMembership } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const { EXPIRING_DAYS } = require("./gym.constants");

// Sequential per-venue numbers (member code, receipt number) without gaps/races.
async function nextSeq(tx, venueId, table, col) {
  await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:k))", { replacements: { k: `${table}:${venueId}` }, transaction: tx });
  const [[row]] = await sequelize.query(`SELECT COALESCE(MAX(${col}), 0) + 1 AS n FROM ${table} WHERE venue_id = :v`, {
    replacements: { v: venueId }, transaction: tx
  });
  return Number(row.n);
}

// Adds days_left + display_status (active | expiring | expired | frozen | new).
function present(member, today = U.todayIST()) {
  const j = typeof member.toJSON === "function" ? member.toJSON() : { ...member };
  delete j.portal_token;
  j.days_left = j.end_date ? U.diffDays(today, j.end_date) : null;
  if (j.status === "frozen") j.display_status = "frozen";
  else if (!j.end_date) j.display_status = "new";
  else if (j.days_left < 0) j.display_status = "expired";
  else if (j.days_left <= EXPIRING_DAYS) j.display_status = "expiring";
  else j.display_status = "active";
  return j;
}

// Server-side price. The client preview is only a preview.
function quote(plan, { includePt = false, extraDiscount = 0, waiveJoining = false, firstTime = true } = {}) {
  const base = U.money(plan.price);
  const planDiscount = U.money((base * Number(plan.discount_percent || 0)) / 100);
  const extra = U.money(Math.min(Math.max(Number(extraDiscount) || 0, 0), base - planDiscount));
  const joining = firstTime && !waiveJoining ? U.money(plan.joining_fee) : 0;
  const pt = includePt ? U.money(plan.pt_addon_price) : 0;
  return { base, discount: U.money(planDiscount + extra), joining, pt, total: U.money(base - planDiscount - extra + joining + pt) };
}

async function loadPlan(venueId, planId) {
  const plan = planId ? await GymPlan.findOne({ where: { id: planId, venue_id: venueId } }) : null;
  if (!plan) throw new AppError("Plan not found", 404);
  return plan;
}

async function findMember(venueId, id, tx) {
  const m = await GymMember.findOne({ where: { id, venue_id: venueId, is_archived: false }, transaction: tx });
  if (!m) throw new AppError("Member not found", 404);
  return m;
}

function checkDate(v, label = "Date") {
  if (!U.isYmd(v)) throw new AppError(`${label} must be in YYYY-MM-DD format`, 400);
  if (Math.abs(U.diffDays(U.todayIST(), v)) > 400) throw new AppError(`${label} is out of range`, 400);
  return v;
}

async function createMembership(tx, { venueId, member, plan, kind, start, includePt, extraDiscount, waiveJoining, notes }) {
  const q = quote(plan, { includePt, extraDiscount, waiveJoining, firstTime: kind === "new" });
  return GymMembership.create({
    venue_id: venueId, member_id: member.id, plan_id: plan.id, plan_name: plan.name, kind,
    start_date: start, end_date: U.membershipEnd(start, plan.duration_unit, plan.duration_value),
    base_price: q.base, discount_amount: q.discount, joining_fee: q.joining, pt_amount: q.pt, total_amount: q.total,
    tax_rate: plan.tax_rate, has_pt: !!includePt, notes: notes || null
  }, { transaction: tx });
}

async function syncMemberFromMembership(tx, member, ms) {
  const today = U.todayIST();
  await member.update({
    plan_id: ms.plan_id, plan_name: ms.plan_name, has_pt: ms.has_pt,
    start_date: ms.start_date, end_date: ms.end_date, joined_on: member.joined_on || ms.start_date,
    status: member.status === "frozen" ? "frozen" : ms.end_date < today ? "expired" : "active"
  }, { transaction: tx });
}

// Single source of truth for money fields on memberships and members.
async function recomputeFinancials(tx, memberId) {
  await sequelize.query(
    `UPDATE gym_memberships ms SET amount_paid = COALESCE((
       SELECT SUM(p.amount) FROM gym_payments p WHERE p.membership_id = ms.id AND p.status = 'paid'), 0)
     WHERE ms.member_id = :id`,
    { replacements: { id: memberId }, transaction: tx }
  );
  await sequelize.query(
    `UPDATE gym_members m SET
       balance_due = COALESCE((SELECT SUM(GREATEST(ms.total_amount - ms.amount_paid, 0))
                               FROM gym_memberships ms WHERE ms.member_id = m.id AND ms.status = 'active'), 0),
       total_paid  = COALESCE((SELECT SUM(p.amount) FROM gym_payments p WHERE p.member_id = m.id AND p.status = 'paid'), 0)
     WHERE m.id = :id`,
    { replacements: { id: memberId }, transaction: tx }
  );
}

// Oldest membership that still has a balance; otherwise the latest one.
async function pickMembership(tx, memberId) {
  const open = await GymMembership.findAll({ where: { member_id: memberId, status: "active" }, order: [["start_date", "ASC"]], transaction: tx || undefined });
  return open.find((m) => Number(m.total_amount) - Number(m.amount_paid) > 0.009) || open[open.length - 1] || null;
}

module.exports = { nextSeq, present, quote, loadPlan, findMember, checkDate, createMembership, syncMemberFromMembership, recomputeFinancials, pickMembership };