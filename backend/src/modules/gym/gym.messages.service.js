const { Op } = require("sequelize");
const env = require("../../config/env");
const { GymPayment, GymWorkoutPlan, GymMember, GymLead } = require("../../database/models");
const { GymMessageTemplate, GymMessageLog } = require("./gym.message.models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const C = require("./gym.constants");
const core = require("./gym.core");
const payments = require("./gym.payments.service");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RECIPIENTS = 500;
const siteUrl = (venue) => (venue.subdomain ? `https://${venue.subdomain}.${env.baseDomain}` : "");

/* 1. Single member message (Message button on the member page). Platform sends nothing. */
async function build(ctx, member, q) {
  const { venue, settings } = ctx;
  const today = U.todayIST();
  const base = {
    name: U.firstName(member.name), gym: venue.hall_name, plan: member.plan_name || "",
    expiry: member.end_date ? U.fmtDate(member.end_date) : "", balance: U.inr(member.balance_due)
  };

  switch (q.type) {
    case "renewal": {
      if (!member.end_date) throw new AppError("This member has no plan yet", 400);
      const dl = U.diffDays(today, member.end_date);
      const link = U.renewLink(member);
      if (dl < 0) return { text: U.msg(settings, "winback", { ...base, link }), link };
      const when = dl === 0 ? "aaj" : dl === 1 ? "kal" : `${dl} din baad`;
      return { text: U.msg(settings, "expiry_reminder", { ...base, when, link }), link };
    }
    case "dues": {
      const ms = await core.pickMembership(null, member.id);
      const due = ms ? U.money(Number(ms.total_amount) - Number(ms.amount_paid)) : 0;
      if (due <= 0) throw new AppError("No dues pending for this member", 400);
      let link = "";
      try {
        link = (await payments.createRequest({ venue, settings, member, amount: due, membershipId: ms.id })).url;
      } catch (e) { /* no UPI / Razorpay set up: the text is still useful without a link */ }
      return { text: U.msg(settings, "payment_due", { ...base, balance: U.inr(due), link }), link };
    }
    case "welcome":
      return { text: U.msg(settings, "welcome", base), link: "" };
    case "receipt": {
      const pay = UUID_RE.test(String(q.payment_id)) ? await GymPayment.findOne({ where: { id: q.payment_id, member_id: member.id, status: "paid" } }) : null;
      if (!pay) throw new AppError("Payment not found", 404);
      return { text: U.msg(settings, "receipt", { ...base, amount: U.inr(pay.amount), receipt: pay.receipt_no || "" }), link: "" };
    }
    case "workout": {
      const plan = UUID_RE.test(String(q.plan_id)) ? await GymWorkoutPlan.findOne({ where: { id: q.plan_id, member_id: member.id } }) : null;
      if (!plan) throw new AppError("Workout plan not found", 404);
      const link = `${U.publicApiBase()}/public/gym/workout/${plan.share_token}/pdf`;
      return { text: U.msg(settings, "workout_plan", { ...base, plan: plan.name, link }), link };
    }
    default:
      throw new AppError("Invalid message type", 400);
  }
}

async function compose(ctx, memberId, q) {
  const member = await core.findMember(ctx.venue.id, memberId);
  const res = await build(ctx, member, q);
  return { ...res, phone: U.waNumber(member.phone) };
}

/* 2. Template library: built-in templates (editable) + the vendor's own templates */
function systemList(settings) {
  const over = (settings && settings.message_templates) || {};
  return C.SYSTEM_TEMPLATES.map((t) => ({
    id: `sys:${t.key}`, key: t.key, title: t.title, category: t.category, for: t.for, bulk: t.bulk, system: true,
    body: over[t.key] || C.DEFAULT_MESSAGES[t.key], default_body: C.DEFAULT_MESSAGES[t.key], customised: !!over[t.key]
  }));
}

async function listTemplates({ venue, settings }) {
  const custom = await GymMessageTemplate.findAll({ where: { venue_id: venue.id }, order: [["createdAt", "DESC"]], limit: 200 });
  return {
    templates: [
      ...systemList(settings),
      ...custom.map((c) => ({ id: c.id, key: null, title: c.title, category: c.category, for: "both", bulk: true, system: false, body: c.body }))
    ],
    categories: C.MESSAGE_CATEGORIES,
    variables: C.MESSAGE_VARIABLES
  };
}

function templateFields(b) {
  const title = String(b.title || "").trim();
  const body = String(b.body || "").trim();
  if (title.length < 2) throw new AppError("Give the template a name", 400);
  if (!body) throw new AppError("Message text is required", 400);
  if (body.length > 1000) throw new AppError("Message is too long (max 1000 characters)", 400);
  return { title: title.slice(0, 80), body, category: C.MESSAGE_CATEGORIES.some(([k]) => k === b.category) ? b.category : "custom" };
}

const createTemplate = (venueId, b) => GymMessageTemplate.create({ ...templateFields(b), venue_id: venueId });

async function ownTemplate(venueId, id) {
  const t = UUID_RE.test(String(id)) ? await GymMessageTemplate.findOne({ where: { id, venue_id: venueId } }) : null;
  if (!t) throw new AppError("Template not found", 404);
  return t;
}
const updateTemplate = async (venueId, id, b) => (await ownTemplate(venueId, id)).update(templateFields(b));
const deleteTemplate = async (venueId, id) => { await (await ownTemplate(venueId, id)).destroy(); return { deleted: true }; };

// Built-in templates are edited by saving the vendor's own wording over them. Reset = remove it.
async function saveSystemTemplate({ settings }, key, body) {
  if (!C.MESSAGE_KEYS.includes(key)) throw new AppError("Unknown template", 404);
  const text = String(body || "").trim();
  if (!text) throw new AppError("Message text is required", 400);
  if (text.length > 1000) throw new AppError("Message is too long (max 1000 characters)", 400);
  await settings.update({ message_templates: { ...(settings.message_templates || {}), [key]: text } });
  return systemList(settings).find((t) => t.key === key);
}

async function resetSystemTemplate({ settings }, key) {
  if (!C.MESSAGE_KEYS.includes(key)) throw new AppError("Unknown template", 404);
  const next = { ...(settings.message_templates || {}) };
  delete next[key];
  await settings.update({ message_templates: next });
  return systemList(settings).find((t) => t.key === key);
}

/* 3. Audiences. Every recipient comes back with its own variables, so the browser can fill the
   template live while the vendor edits it. */
const MEMBER_SEGMENTS = [
  ["expiring", "Expiring in 7 days"], ["expired_recent", "Expired in last 30 days"], ["expired", "All expired"],
  ["dues", "Pending dues"], ["active", "Active members"], ["birthday_today", "Birthday today"],
  ["birthday_month", "Birthday this month"], ["new_month", "Joined this month"], ["frozen", "Frozen"],
  ["no_plan", "No plan yet"], ["all", "All members"]
];
const LEAD_SEGMENTS = [["leads_open", "Open leads"], ["leads_new", "New leads"], ["leads_trial", "Trial booked"]];
const LEAD_STATUS_BY_SEGMENT = {
  leads_open: ["new", "contacted", "trial_booked", "trial_done"],
  leads_new: ["new"],
  leads_trial: ["trial_booked"]
};

const loadMembers = (venueId) =>
  GymMember.findAll({ where: { venue_id: venueId, is_archived: false }, order: [["name", "ASC"]], limit: 3000 });

function inSegment(m, p, seg, today) {
  const md = today.slice(5);
  switch (seg) {
    case "all": return true;
    case "active": return p.display_status === "active" || p.display_status === "expiring";
    case "expiring": return p.display_status === "expiring";
    case "expired": return p.display_status === "expired";
    case "expired_recent": return p.display_status === "expired" && p.days_left >= -30;
    case "dues": return Number(m.balance_due) > 0;
    case "frozen": return p.display_status === "frozen";
    case "no_plan": return p.display_status === "new";
    case "new_month": return !!m.joined_on && String(m.joined_on) >= `${today.slice(0, 8)}01`;
    case "birthday_today": return !!m.dob && String(m.dob).slice(5) === md;
    case "birthday_month": return !!m.dob && String(m.dob).slice(5, 7) === md.slice(0, 2);
    default: return false;
  }
}

function memberVars(m, p, venue, today) {
  const dl = p.days_left;
  const when = dl == null ? "" : dl === 0 ? "aaj" : dl === 1 ? "kal" : dl > 1 ? `${dl} din baad` : `${Math.abs(dl)} din pehle`;
  return {
    name: U.firstName(m.name), full_name: m.name, gym: venue.hall_name, plan: m.plan_name || "",
    expiry: m.end_date ? U.fmtDate(m.end_date) : "", days_left: dl == null ? "" : String(dl), when,
    balance: U.inr(m.balance_due), link: U.renewLink(m), member_id: m.member_code, trainer: m.trainer_name || "",
    goal: m.goal ? String(m.goal).replace(/_/g, " ") : "", trial_date: "", gym_phone: venue.phone || "",
    website: siteUrl(venue), date: U.fmtDate(today)
  };
}

function leadVars(l, venue, today) {
  return {
    name: U.firstName(l.name), full_name: l.name, gym: venue.hall_name, plan: "", expiry: "", days_left: "", when: "",
    balance: "", link: "", member_id: "", trainer: "", goal: l.goal ? String(l.goal).replace(/_/g, " ") : "",
    trial_date: l.trial_date ? U.fmtDate(l.trial_date) : "", gym_phone: venue.phone || "", website: siteUrl(venue), date: U.fmtDate(today)
  };
}

async function segments({ venue }) {
  const today = U.todayIST();
  const members = await loadMembers(venue.id);
  const presented = members.map((m) => [m, core.present(m, today)]);
  const out = MEMBER_SEGMENTS.map(([key, label]) => ({
    key, label, group: "members", count: presented.filter(([m, p]) => inSegment(m, p, key, today)).length
  }));
  for (const [key, label] of LEAD_SEGMENTS) {
    out.push({ key, label, group: "leads", count: await GymLead.count({ where: { venue_id: venue.id, status: { [Op.in]: LEAD_STATUS_BY_SEGMENT[key] } } }) });
  }
  return out;
}

async function lastSent(venueId, ids) {
  if (!ids.length) return new Map();
  const rows = await GymMessageLog.findAll({
    where: { venue_id: venueId, recipient_id: ids, createdAt: { [Op.gt]: new Date(Date.now() - 7 * 86400000) } },
    attributes: ["recipient_id", "createdAt"], order: [["createdAt", "DESC"]], limit: 2000
  });
  const map = new Map();
  rows.forEach((r) => { if (!map.has(r.recipient_id)) map.set(r.recipient_id, r.createdAt); });
  return map;
}

function memberItem(m, p, venue, today) {
  const parts = [m.plan_name || "No plan", m.end_date ? `till ${U.fmtDate(m.end_date)}` : null, Number(m.balance_due) > 0 ? `due ₹${U.inr(m.balance_due)}` : null];
  return {
    type: "member", id: m.id, name: m.name, phone: m.phone, wa_phone: U.waNumber(m.phone),
    sub: parts.filter(Boolean).join(" · "), vars: memberVars(m, p, venue, today)
  };
}

function leadItem(l, venue, today) {
  const parts = [l.goal ? String(l.goal).replace(/_/g, " ") : "No goal given", l.preferred_time ? `prefers ${l.preferred_time}` : null];
  return {
    type: "lead", id: l.id, name: l.name, phone: l.phone, wa_phone: U.waNumber(l.phone),
    sub: parts.filter(Boolean).join(" · "), vars: leadVars(l, venue, today)
  };
}

async function audience(ctx, q) {
  const { venue } = ctx;
  const today = U.todayIST();
  const needle = String(q.q || "").trim().toLowerCase();
  let items = [];

  if (q.lead_id) {
    const l = UUID_RE.test(String(q.lead_id)) ? await GymLead.findOne({ where: { id: q.lead_id, venue_id: venue.id } }) : null;
    if (!l) throw new AppError("Lead not found", 404);
    items = [leadItem(l, venue, today)];
  } else if (q.member_id) {
    const m = await core.findMember(venue.id, q.member_id);
    items = [memberItem(m, core.present(m, today), venue, today)];
  } else if (LEAD_STATUS_BY_SEGMENT[q.segment]) {
    const leads = await GymLead.findAll({
      where: { venue_id: venue.id, status: { [Op.in]: LEAD_STATUS_BY_SEGMENT[q.segment] } }, order: [["createdAt", "DESC"]], limit: MAX_RECIPIENTS
    });
    items = leads.map((l) => leadItem(l, venue, today));
  } else {
    const seg = MEMBER_SEGMENTS.some(([k]) => k === q.segment) ? q.segment : "expiring";
    const members = await loadMembers(venue.id);
    items = members
      .map((m) => [m, core.present(m, today)])
      .filter(([m, p]) => inSegment(m, p, seg, today))
      .map(([m, p]) => memberItem(m, p, venue, today));
  }

  if (needle) items = items.filter((i) => i.name.toLowerCase().includes(needle) || i.phone.includes(needle));
  const total = items.length;
  items = items.slice(0, MAX_RECIPIENTS);

  const sent = await lastSent(venue.id, items.map((i) => i.id));
  items.forEach((i) => { i.last_sent_at = sent.get(i.id) || null; });
  return { items, total, truncated: total > items.length };
}

/* 4. Remember who was messaged */
async function logSent({ venue, user }, b) {
  const list = (Array.isArray(b.items) ? b.items : []).filter((i) => i && UUID_RE.test(String(i.id))).slice(0, MAX_RECIPIENTS);
  if (!list.length) throw new AppError("Nothing to log", 400);
  const memberIds = list.filter((i) => i.type === "member").map((i) => i.id);
  const leadIds = list.filter((i) => i.type === "lead").map((i) => i.id);

  const [members, leads] = await Promise.all([
    memberIds.length ? GymMember.findAll({ where: { id: memberIds, venue_id: venue.id }, attributes: ["id", "name", "phone"] }) : [],
    leadIds.length ? GymLead.findAll({ where: { id: leadIds, venue_id: venue.id }, attributes: ["id", "name", "phone"] }) : []
  ]);
  const label = String(b.label || "").trim().slice(0, 80) || null;
  const rows = [
    ...members.map((m) => ({ venue_id: venue.id, recipient_type: "member", recipient_id: m.id, name: m.name, phone: m.phone, label, sent_by: user && user.name })),
    ...leads.map((l) => ({ venue_id: venue.id, recipient_type: "lead", recipient_id: l.id, name: l.name, phone: l.phone, label, sent_by: user && user.name }))
  ];
  if (rows.length) await GymMessageLog.bulkCreate(rows);

  // A lead that was just messaged is no longer "new".
  if (b.mark_contacted && leads.length) {
    await GymLead.update({ status: "contacted" }, { where: { id: leads.map((l) => l.id), venue_id: venue.id, status: "new" } });
  }
  return { logged: rows.length };
}

module.exports = {
  compose, listTemplates, createTemplate, updateTemplate, deleteTemplate,
  saveSystemTemplate, resetSystemTemplate, segments, audience, logSent
};