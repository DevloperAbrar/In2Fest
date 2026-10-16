const { Op } = require("sequelize");
const PDFDocument = require("pdfkit");
const { Venue, GymMember, GymExercise, GymWorkoutPlan } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const C = require("./gym.constants");
const core = require("./gym.core");
 

/* ---------- exercise library ---------- */
const listExercises = (venueId, q) => {
  const where = { is_active: true, [Op.or]: [{ venue_id: null }, { venue_id: venueId }] };
  if (C.BODY_PARTS.includes(q.body_part)) where.body_part = q.body_part;
  if (q.q && String(q.q).trim()) where.name = { [Op.iLike]: `%${U.likeEscape(q.q)}%` };
  return GymExercise.findAll({ where, order: [["body_part", "ASC"], ["name", "ASC"]], limit: 300 });
};

function exerciseFields(b) {
  const name = String(b.name || "").trim();
  if (!name) throw new AppError("Exercise name is required", 400);
  if (!C.BODY_PARTS.includes(b.body_part)) throw new AppError("Pick a valid body part", 400);
  return {
    name: name.slice(0, 100), body_part: b.body_part, equipment: String(b.equipment || "").slice(0, 60) || null,
    instructions: String(b.instructions || "").slice(0, 1000) || null, video_url: String(b.video_url || "").slice(0, 300) || null
  };
}
const createExercise = (venueId, b) => GymExercise.create({ ...exerciseFields(b), venue_id: venueId });

async function ownExercise(venueId, id) {
  const ex = await GymExercise.findOne({ where: { id, venue_id: venueId } }); // built-in (venue_id NULL) is never matched
  if (!ex) throw new AppError("Exercise not found, or it is part of the built-in library", 404);
  return ex;
}
const updateExercise = async (venueId, id, b) => (await ownExercise(venueId, id)).update(exerciseFields(b));
const deleteExercise = async (venueId, id) => { await (await ownExercise(venueId, id)).destroy(); return { deleted: true }; };

/* ---------- plans ---------- */
function cleanDays(days) {
  if (!Array.isArray(days) || days.length < 1 || days.length > 7) throw new AppError("Add between 1 and 7 workout days", 400);
  return days.map((d, i) => ({
    day_number: i + 1,
    title: String((d && d.title) || `Day ${i + 1}`).trim().slice(0, 80),
    focus: Array.isArray(d && d.focus) ? d.focus.filter((f) => C.BODY_PARTS.includes(f)) : [],
    notes: String((d && d.notes) || "").slice(0, 500),
    exercises: (Array.isArray(d && d.exercises) ? d.exercises : []).slice(0, 30).map((e) => ({
      exercise_id: e.exercise_id || null,
      name: String(e.name || "").trim().slice(0, 100),
      body_part: C.BODY_PARTS.includes(e.body_part) ? e.body_part : null,
      sets: Math.min(Math.max(parseInt(e.sets, 10) || 0, 0), 20),
      reps: String(e.reps || "").slice(0, 20),
      rest_sec: Math.min(Math.max(parseInt(e.rest_sec, 10) || 0, 0), 600),
      notes: String(e.notes || "").slice(0, 200)
    })).filter((e) => e.name)
  }));
}

function planFields(b, creating) {
  const o = {};
  if (creating || b.name !== undefined) {
    const n = String(b.name || "").trim();
    if (!n) throw new AppError("Plan name is required", 400);
    o.name = n.slice(0, 100);
  }
  if (b.goal !== undefined) o.goal = C.GOALS.includes(b.goal) ? b.goal : null;
  if (b.level !== undefined) o.level = C.LEVELS.includes(b.level) ? b.level : null;
  if (b.duration_weeks !== undefined) o.duration_weeks = b.duration_weeks ? U.num(b.duration_weeks, "Duration", { min: 1, max: 52, int: true }) : null;
  if (b.notes !== undefined) o.notes = String(b.notes || "").slice(0, 1500) || null;
  if (creating || b.days !== undefined) o.days = cleanDays(b.days);
  return o;
}

async function listPlans(venueId, q) {
  const where = { venue_id: venueId };
  if (q.template === "true") where.is_template = true;
  if (q.template === "false") where.is_template = false;
  if (q.member_id) where.member_id = q.member_id;
  return GymWorkoutPlan.findAll({
    where, order: [["updatedAt", "DESC"]], limit: 200,
    include: [{ model: GymMember, as: "member", attributes: ["id", "name", "phone"] }]
  });
}

async function getPlan(venueId, id) {
  const plan = await GymWorkoutPlan.findOne({ where: { id, venue_id: venueId }, include: [{ model: GymMember, as: "member", attributes: ["id", "name", "phone"] }] });
  if (!plan) throw new AppError("Workout plan not found", 404);
  return plan;
}

async function createPlan(venueId, b) {
  const isTemplate = !!b.is_template || !b.member_id;
  if (b.member_id) await core.findMember(venueId, b.member_id);
  return GymWorkoutPlan.create({
    ...planFields(b, true), venue_id: venueId, is_template: isTemplate, member_id: isTemplate ? null : b.member_id,
    share_token: isTemplate ? null : U.token()
  });
}

async function updatePlan(venueId, id, b) {
  return (await getPlan(venueId, id)).update(planFields(b, false));
}

async function deletePlan(venueId, id) {
  await (await getPlan(venueId, id)).destroy();
  return { deleted: true };
}

// Copy a template to one or more members (each gets its own editable plan + a PDF link).
async function assign(ctx, templateId, memberIds) {
    const { venue } = ctx;
    const tpl = await getPlan(venue.id, templateId);
    if (!tpl.is_template) throw new AppError("Only templates can be assigned", 400);
    const ids = [...new Set(Array.isArray(memberIds) ? memberIds : [])].slice(0, 100);
    if (!ids.length) throw new AppError("Select at least one member", 400);
    const members = await GymMember.findAll({ where: { id: ids, venue_id: venue.id, is_archived: false } });
    if (!members.length) throw new AppError("No valid members selected", 400);
    const created = [];
    for (const m of members) {
      created.push(await GymWorkoutPlan.create({
        venue_id: venue.id, member_id: m.id, source_template_id: tpl.id, name: tpl.name, goal: tpl.goal, level: tpl.level,
        duration_weeks: tpl.duration_weeks, days: tpl.days, notes: tpl.notes, is_template: false, share_token: U.token()
      }));
    }
    return { assigned: created.length, plans: created };
  }





async function installStarters(venueId) {
  const bodyPart = Object.fromEntries(C.EXERCISE_SEED.map((e) => [e[0], e[1]]));
  const have = new Set((await GymWorkoutPlan.findAll({ where: { venue_id: venueId, is_template: true }, attributes: ["name"] })).map((p) => p.name));
  let n = 0;
  for (const t of C.STARTER_TEMPLATES) {
    if (have.has(t.name)) continue;
    await GymWorkoutPlan.create({
      venue_id: venueId, is_template: true, name: t.name, goal: t.goal, level: t.level, duration_weeks: t.duration_weeks,
      days: cleanDays(t.days.map((d) => ({
        ...d, exercises: d.exercises.map(([name, sets, reps, rest_sec]) => ({ name, body_part: bodyPart[name], sets, reps, rest_sec }))
      })))
    });
    n++;
  }
  return { installed: n };
}

/* ---------- public PDF ---------- */
async function pdfByToken(token, res) {
  const plan = token ? await GymWorkoutPlan.findOne({ where: { share_token: token, is_template: false } }) : null;
  if (!plan) throw new AppError("Workout plan not found", 404);
  const [venue, member] = await Promise.all([Venue.findByPk(plan.venue_id), plan.member_id ? GymMember.findByPk(plan.member_id) : null]);
  renderPdf(res, { gym: venue ? venue.hall_name : "Workout Plan", member, plan });
}

function renderPdf(res, { gym, member, plan }) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${String(plan.name || "workout").replace(/[^\w-]+/g, "_")}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).fillColor("#111").text(gym);
  doc.fontSize(10).fillColor("#777").text("Workout Plan");
  doc.moveDown(0.6).fontSize(16).fillColor("#111").text(plan.name);
  const meta = [member && `Member: ${member.name}`, plan.goal && `Goal: ${plan.goal.replace(/_/g, " ")}`, plan.level && `Level: ${plan.level}`, plan.duration_weeks && `${plan.duration_weeks} weeks`]
    .filter(Boolean).join("   |   ");
  if (meta) doc.fontSize(10).fillColor("#555").text(meta);

  (plan.days || []).forEach((d) => {
    if (doc.y > 690) doc.addPage();
    doc.x = 40;
    doc.moveDown(1).fontSize(13).fillColor("#16a34a").text(`Day ${d.day_number} - ${d.title}`, 40);
    if (!d.exercises.length) { doc.fontSize(10).fillColor("#666").text("Rest / recovery", 40); return; }
    let y = doc.y + 6;
    doc.fontSize(9).fillColor("#888").text("#", 40, y, { width: 20 }).text("Exercise", 62, y, { width: 250 })
      .text("Sets", 320, y, { width: 40 }).text("Reps", 365, y, { width: 60 }).text("Rest", 430, y, { width: 60 });
    y += 16;
    d.exercises.forEach((e, i) => {
      const h = Math.max(doc.fontSize(10).heightOfString(e.name, { width: 250 }), 12);
      if (y + h > 780) { doc.addPage(); y = 40; }
      doc.fillColor("#111").text(String(i + 1), 40, y, { width: 20 }).text(e.name, 62, y, { width: 250 })
        .text(e.sets ? String(e.sets) : "-", 320, y, { width: 40 }).text(e.reps || "-", 365, y, { width: 60 })
        .text(e.rest_sec ? `${e.rest_sec}s` : "-", 430, y, { width: 60 });
      y += h + 6;
    });
    doc.y = y; doc.x = 40;
    if (d.notes) doc.fontSize(9).fillColor("#666").text(`Note: ${d.notes}`, 40, y, { width: 500 });
  });
  if (plan.notes) doc.moveDown(1).fontSize(10).fillColor("#333").text(plan.notes, 40, undefined, { width: 500 });
  doc.end();
}


module.exports = {
    listExercises, createExercise, updateExercise, deleteExercise,
    listPlans, getPlan, createPlan, updatePlan, deletePlan, assign, installStarters, pdfByToken
  };