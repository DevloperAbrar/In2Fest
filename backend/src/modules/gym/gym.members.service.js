const { Op } = require("sequelize");
const { sequelize, GymPlan, GymMember, GymMembership, GymPayment, GymWorkoutPlan, GymLead } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const C = require("./gym.constants");
const core = require("./gym.core");
const payments = require("./gym.payments.service");
 

/* ===================== PLANS ===================== */
function planFields(b, creating) {
  const o = {};
  if (creating || b.name !== undefined) {
    const n = String(b.name || "").trim();
    if (!n) throw new AppError("Plan name is required", 400);
    o.name = n.slice(0, 80);
  }
  if (b.description !== undefined) o.description = String(b.description || "").slice(0, 500);
  if (creating || b.duration_unit !== undefined) {
    if (!["months", "days"].includes(b.duration_unit)) throw new AppError("Duration unit must be months or days", 400);
    o.duration_unit = b.duration_unit;
  }
  if (creating || b.duration_value !== undefined) o.duration_value = U.num(b.duration_value, "Duration", { min: 1, max: 600, int: true });
  if (creating || b.price !== undefined) o.price = U.num(b.price, "Price", { max: 1000000 });
  if (b.discount_percent !== undefined) o.discount_percent = U.num(b.discount_percent || 0, "Discount", { max: 100 });
  if (b.joining_fee !== undefined) o.joining_fee = U.num(b.joining_fee || 0, "Joining fee", { max: 1000000 });
  if (b.pt_addon_price !== undefined) o.pt_addon_price = U.num(b.pt_addon_price || 0, "Personal training price", { max: 1000000 });
  if (b.tax_rate !== undefined) o.tax_rate = U.num(b.tax_rate || 0, "Tax rate", { max: 28 });
  if (b.freeze_allowed !== undefined) o.freeze_allowed = !!b.freeze_allowed;
  if (b.max_freeze_days !== undefined) o.max_freeze_days = U.num(b.max_freeze_days || 0, "Max freeze days", { max: 365, int: true });
  if (b.is_popular !== undefined) o.is_popular = !!b.is_popular;
  if (b.is_active !== undefined) o.is_active = !!b.is_active;
  if (b.sort_order !== undefined) o.sort_order = U.num(b.sort_order || 0, "Sort order", { max: 1000, int: true });
  return o;
}

const listPlans = (venueId, all) =>
  GymPlan.findAll({ where: { venue_id: venueId, ...(all ? {} : { is_active: true }) }, order: [["sort_order", "ASC"], ["duration_value", "ASC"], ["price", "ASC"]] });

const createPlan = (venueId, b) => GymPlan.create({ ...planFields(b, true), venue_id: venueId });

async function updatePlan(venueId, id, b) {
  const plan = await core.loadPlan(venueId, id);
  return plan.update(planFields(b, false));
}

async function deletePlan(venueId, id) {
  const plan = await core.loadPlan(venueId, id);
  if (await GymMembership.count({ where: { plan_id: id } })) {
    await plan.update({ is_active: false });
    return { archived: true };
  }
  await plan.destroy();
  return { deleted: true };
}

/* ===================== MEMBERS ===================== */
function memberFields(b, creating) {
  const o = {};
  if (creating || b.name !== undefined) {
    const n = String(b.name || "").trim();
    if (n.length < 2) throw new AppError("Member name is required", 400);
    o.name = n.slice(0, 100);
  }
  if (creating || b.phone !== undefined) o.phone = U.normalizePhone(b.phone);
  if (b.email !== undefined) o.email = String(b.email || "").trim().slice(0, 120) || null;
  if (b.gender !== undefined) o.gender = C.GENDERS.includes(b.gender) ? b.gender : null;
  if (b.dob !== undefined) o.dob = b.dob && U.isYmd(b.dob) ? b.dob : null;
  if (b.goal !== undefined) o.goal = C.GOALS.includes(b.goal) ? b.goal : null;
  if (b.health_notes !== undefined) o.health_notes = String(b.health_notes || "").slice(0, 1000) || null;
  if (b.emergency_name !== undefined) o.emergency_name = String(b.emergency_name || "").slice(0, 100) || null;
  if (b.emergency_phone !== undefined) o.emergency_phone = String(b.emergency_phone || "").replace(/\D/g, "").slice(0, 15) || null;
  if (b.trainer_name !== undefined) o.trainer_name = String(b.trainer_name || "").slice(0, 100) || null;
  if (b.source !== undefined) o.source = String(b.source || "").slice(0, 30) || null;
  if (b.notes !== undefined) o.notes = String(b.notes || "").slice(0, 1000) || null;
  if (b.photo_url !== undefined) {
    const base = String(process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
    o.photo_url = b.photo_url && base && String(b.photo_url).startsWith(`${base}/`) ? b.photo_url : null;
  }
  return o;
}

async function assertPhoneFree(venueId, phone, exceptId) {
  const dup = await GymMember.findOne({ where: { venue_id: venueId, phone, is_archived: false, ...(exceptId ? { id: { [Op.ne]: exceptId } } : {}) } });
  if (dup) throw new AppError(`A member with this phone already exists (${dup.name})`, 409);
}

async function listMembers(venueId, q) {
  const today = U.todayIST();
  const live = { status: { [Op.notIn]: ["frozen", "cancelled"] } };
  const clauses = [{ venue_id: venueId, is_archived: false }];
  switch (q.status) {
    case "active": clauses.push(live, { end_date: { [Op.gte]: today } }); break;
    case "expiring": {
      const days = Math.min(Math.max(parseInt(q.days, 10) || 7, 1), 60);
      clauses.push(live, { end_date: { [Op.between]: [today, U.addDays(today, days)] } });
      break;
    }
    case "expired": clauses.push(live, { end_date: { [Op.lt]: today } }); break;
    case "frozen": clauses.push({ status: "frozen" }); break;
    case "dues": clauses.push({ balance_due: { [Op.gt]: 0 } }); break;
    case "new": clauses.push({ end_date: null }); break;
    default: break;
  }
  if (q.q && String(q.q).trim()) {
    const s = `%${U.likeEscape(q.q)}%`;
    clauses.push({ [Op.or]: [{ name: { [Op.iLike]: s } }, { phone: { [Op.like]: s } }, { member_code: { [Op.iLike]: s } }] });
  }
  const order =
    q.status === "expiring" ? [["end_date", "ASC"]] :
    q.status === "expired" ? [["end_date", "DESC"]] :
    q.status === "dues" ? [["balance_due", "DESC"]] : [["createdAt", "DESC"]];
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(parseInt(q.limit, 10) || 25, 100);
  const { rows, count } = await GymMember.findAndCountAll({ where: { [Op.and]: clauses }, order, limit, offset: (page - 1) * limit });
  return { items: rows.map((m) => core.present(m, today)), total: count, page, pages: Math.max(Math.ceil(count / limit), 1) };
}

async function getDetail(ctx, id) {
  const { venue, settings } = ctx;
  const member = await core.findMember(venue.id, id);
  const [memberships, payments_, workouts, plan] = await Promise.all([
    GymMembership.findAll({ where: { member_id: id }, order: [["start_date", "DESC"]] }),
    GymPayment.findAll({ where: { member_id: id }, order: [["createdAt", "DESC"]], limit: 100 }),
    GymWorkoutPlan.findAll({ where: { member_id: id }, attributes: ["id", "name", "goal", "share_token", "sent_at", "createdAt"], order: [["createdAt", "DESC"]] }),
    member.plan_id ? GymPlan.findByPk(member.plan_id) : null
  ]);
  return {
    member: core.present(member), memberships, payments: payments_, workout_plans: workouts,
    renewal_quote: plan && plan.is_active ? core.quote(plan, { includePt: member.has_pt, firstTime: false }) : null,
    renew_link: U.renewLink(member),
    pay_ready: { razorpay: !!payments.rzpClient(settings), upi: !!venue.upi_id },
    plan: plan ? { id: plan.id, freeze_allowed: plan.freeze_allowed, max_freeze_days: plan.max_freeze_days } : null
  };
}

async function enroll(ctx, b) {
  const { venue, settings, user } = ctx;
  const fields = memberFields(b, true);
  await assertPhoneFree(venue.id, fields.phone);
  const plan = await core.loadPlan(venue.id, b.plan_id);
  if (!plan.is_active) throw new AppError("This plan is inactive", 409);
  const start = b.start_date ? core.checkDate(b.start_date, "Start date") : U.todayIST();

  let member, ms, payment;
  await sequelize.transaction(async (tx) => {
    const seq = await core.nextSeq(tx, venue.id, "gym_members", "seq");
    member = await GymMember.create({ ...fields, venue_id: venue.id, seq, member_code: `M${String(seq).padStart(4, "0")}`, portal_token: U.token() }, { transaction: tx });
    ms = await core.createMembership(tx, { venueId: venue.id, member, plan, kind: "new", start, includePt: !!b.include_pt, extraDiscount: b.extra_discount, waiveJoining: !!b.waive_joining });
    await core.syncMemberFromMembership(tx, member, ms);
    if (b.payment && Number(b.payment.amount) > 0) {
      payment = await payments.createPaidTx(tx, { ...b.payment, venue, settings, member, membership: ms, receivedBy: user.name });
    }
    await core.recomputeFinancials(tx, member.id);
    await member.reload({ transaction: tx });
    if (b.lead_id) {
      await GymLead.update({ status: "converted", converted_member_id: member.id }, { where: { id: b.lead_id, venue_id: venue.id }, transaction: tx });
    }
  });
 
  return { member: core.present(member), membership: ms, payment };
}

async function updateMember(venueId, id, b) {
  const member = await core.findMember(venueId, id);
  const fields = memberFields(b, false);
  if (fields.phone) await assertPhoneFree(venueId, fields.phone, id);
  await member.update(fields);
  return core.present(member);
}

async function archiveMember(venueId, id) {
  const member = await core.findMember(venueId, id);
  await member.update({ is_archived: true });
  await GymPayment.update({ status: "cancelled" }, { where: { member_id: id, status: "pending" } });
  return { archived: true };
}

const setPhoto = async (venueId, id, url) => {
  const member = await core.findMember(venueId, id);
  await member.update({ photo_url: url });
  return core.present(member);
};

async function renew(ctx, id, b) {
  const { venue, settings, user } = ctx;
  let out;
  await sequelize.transaction(async (tx) => {
    const member = await GymMember.findOne({ where: { id, venue_id: venue.id, is_archived: false }, transaction: tx, lock: tx.LOCK.UPDATE });
    if (!member) throw new AppError("Member not found", 404);
    if (member.status === "frozen") throw new AppError("Unfreeze this member before renewing", 409);
    const plan = await core.loadPlan(venue.id, b.plan_id || member.plan_id);
    if (!plan.is_active) throw new AppError("This plan is inactive. Pick another plan.", 409);
    const today = U.todayIST();
    const start = b.start_date
      ? core.checkDate(b.start_date, "Start date")
      : member.end_date && member.end_date >= today ? U.addDays(member.end_date, 1) : today;
    const ms = await core.createMembership(tx, { venueId: venue.id, member, plan, kind: "renewal", start, includePt: !!b.include_pt, extraDiscount: b.extra_discount });
    await core.syncMemberFromMembership(tx, member, ms);
    let payment = null;
    if (b.payment && Number(b.payment.amount) > 0) {
      payment = await payments.createPaidTx(tx, { ...b.payment, venue, settings, member, membership: ms, receivedBy: user.name });
    }
    await core.recomputeFinancials(tx, member.id);
    await member.reload({ transaction: tx });
    out = { member, ms, payment };
  });
 
  return { member: core.present(out.member), membership: out.ms, payment: out.payment };
}

async function freeze(venueId, id, b) {
  return sequelize.transaction(async (tx) => {
    const member = await GymMember.findOne({ where: { id, venue_id: venueId, is_archived: false }, transaction: tx, lock: tx.LOCK.UPDATE });
    if (!member) throw new AppError("Member not found", 404);
    const today = U.todayIST();
    if (member.status === "frozen") throw new AppError("Member is already frozen", 409);
    if (!member.end_date || member.end_date < today) throw new AppError("Only members with a running membership can be frozen", 409);
    const plan = member.plan_id ? await GymPlan.findByPk(member.plan_id, { transaction: tx }) : null;
    if (plan && !plan.freeze_allowed) throw new AppError("This plan does not allow freezing", 400);
    const ms = await GymMembership.findOne({ where: { member_id: id, status: "active" }, order: [["end_date", "DESC"]], transaction: tx });
    const left = (plan ? plan.max_freeze_days : 15) - (ms ? ms.freeze_days_used : 0);
    const days = U.num(b.days, "Freeze days", { min: 1, max: 365, int: true });
    if (days > left) throw new AppError(left > 0 ? `Only ${left} freeze day(s) left on this plan` : "No freeze days left on this plan", 400);
    await member.update({ status: "frozen", frozen_on: today, freeze_until: U.addDays(today, days - 1) }, { transaction: tx });
    return core.present(member);
  });
}

// Extends the membership by the days actually frozen. `auto` = scheduled end of freeze.
async function unfreezeTx(tx, member, auto) {
  const today = U.todayIST();
  const planned = U.diffDays(member.frozen_on, member.freeze_until) + 1;
  const used = auto ? planned : Math.min(Math.max(U.diffDays(member.frozen_on, today), 0), planned);
  const ms = await GymMembership.findOne({ where: { member_id: member.id, status: "active" }, order: [["end_date", "DESC"]], transaction: tx });
  let end = member.end_date;
  if (ms) {
    end = U.addDays(ms.end_date, used);
    await ms.update({ end_date: end, freeze_days_used: ms.freeze_days_used + used }, { transaction: tx });
  }
  await member.update({ status: end < today ? "expired" : "active", end_date: end, frozen_on: null, freeze_until: null }, { transaction: tx });
}

async function unfreeze(venueId, id) {
  return sequelize.transaction(async (tx) => {
    const member = await GymMember.findOne({ where: { id, venue_id: venueId, is_archived: false }, transaction: tx, lock: tx.LOCK.UPDATE });
    if (!member) throw new AppError("Member not found", 404);
    if (member.status !== "frozen") throw new AppError("Member is not frozen", 409);
    await unfreezeTx(tx, member, false);
    return core.present(member);
  });
}

// CSV of whatever the current filter shows. The vendor downloads it and shares / prints it.
async function exportMembers(venueId, q) {
    const rows = [];
    for (let page = 1; page <= 50; page++) {
      const r = await listMembers(venueId, { ...q, page, limit: 100 });
      rows.push(...r.items);
      if (page >= r.pages) break;
    }
    const cell = (v) => {
      const s = String(v ?? "");
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    // text fields: neutralise spreadsheet formulas ( =, +, -, @ at the start )
    const text = (v) => cell(/^[=+\-@\t\r]/.test(String(v ?? "")) ? `'${v}` : v);
    const head = ["Member ID", "Name", "Mobile", "Plan", "Start date", "End date", "Days left", "Status", "Balance due", "Total paid", "Goal", "Trainer"];
    const lines = rows.map((m) => [
      text(m.member_code), text(m.name), cell(m.phone), text(m.plan_name), cell(m.start_date), cell(m.end_date), cell(m.days_left),
      cell(m.display_status), cell(m.balance_due), cell(m.total_paid), text(m.goal), text(m.trainer_name)
    ].join(","));
    return `\uFEFF${[head.join(","), ...lines].join("\r\n")}`; // BOM so Excel reads it as UTF-8
  }

// Cron (daily, 00:10 IST)
async function syncStatuses() {
  const today = U.todayIST();
  await sequelize.query(`UPDATE gym_members SET status = 'expired' WHERE is_archived = false AND status = 'active' AND end_date < :today`, { replacements: { today } });
  await sequelize.query(`UPDATE gym_members SET status = 'active' WHERE is_archived = false AND status = 'expired' AND end_date >= :today`, { replacements: { today } });
  const due = await GymMember.findAll({ where: { status: "frozen", freeze_until: { [Op.lt]: today } }, limit: 500 });
  for (const m of due) {
    try {
      await sequelize.transaction(async (tx) => {
        const fresh = await GymMember.findByPk(m.id, { transaction: tx, lock: tx.LOCK.UPDATE });
        if (fresh && fresh.status === "frozen") await unfreezeTx(tx, fresh, true);
      });
    } catch (e) { console.error("[GYM] auto-unfreeze failed:", m.id, e.message); }
  }
}

module.exports = {
    listPlans, createPlan, updatePlan, deletePlan,
    listMembers, exportMembers, getDetail, enroll, updateMember, archiveMember, setPhoto, renew, freeze, unfreeze, syncStatuses
  };