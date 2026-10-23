const { Op } = require("sequelize");
const PDFDocument = require("pdfkit");
const { Venue, GymMember, GymExercise, GymWorkoutPlan } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const C = require("./gym.constants");
const core = require("./gym.core");
const { T, gymIdentity, caps, line1, fitLine, pill } = require("./gym.brand");
/* ---------- exercise library ---------- */
const listExercises = (venueId, q) => {
  const where = { is_active: true, [Op.or]: [{ venue_id: null }, { venue_id: venueId }] };
  // body_part can be one value or a comma separated list (for example "biceps,triceps,forearms")
  const parts = String(q.body_part || "").split(",").map((s) => s.trim()).filter((s) => C.BODY_PARTS.includes(s));
  if (parts.length) where.body_part = parts.length === 1 ? parts[0] : { [Op.in]: parts };
  if (q.q && String(q.q).trim()) where.name = { [Op.iLike]: `%${U.likeEscape(q.q)}%` };
  return GymExercise.findAll({ where, order: [["body_part", "ASC"], ["name", "ASC"]], limit: 1000 });
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
  const identity = venue ? await gymIdentity(venue) : { name: "Workout Plan", owner: "", phone: "", email: "", address: "" };
  renderPdf(res, { identity, member, plan });
}

function renderPdf(res, { identity: id, member, plan }) {
  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, info: { Title: plan.name || "Workout plan", Author: id.name } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${String(plan.name || "workout").replace(/[^\w-]+/g, "_")}.pdf"`);
  doc.pipe(res);

  const PW = doc.page.width;
  const PH = doc.page.height;
  const M = 40;
  const CW = PW - M * 2;
  const LIMIT = PH - 56; // content never goes below this line (footer lives under it)
  const label = (v) => String(v || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const days = plan.days || [];
  let y = 0;

  /* ---------- header (first page): gym branding + contact details ---------- */
  const contact = [
    id.owner && ["Owner", id.owner],
    id.phone && ["Phone", id.phone],
    id.email && ["Email", id.email],
    id.address && ["Address", id.address]
  ].filter(Boolean);
  const colX = PW - M - 210;
  const colW = 210;
  // Single-line values (owner, phone, email) are shrunk to fit; only the address may wrap.
  const itemH = (k, v) => 9 + (k === "Address" ? Math.min((doc.font("Helvetica").fontSize(8.5), doc.heightOfString(v, { width: colW })), 34) : 11) + 7;
  let blockH = 0;
  contact.forEach(([k, v]) => { blockH += itemH(k, v); });
  const headerH = Math.max(124, 30 + blockH + 14);
  doc.rect(0, 0, PW, headerH).fill(T.ink);
  doc.rect(0, 0, PW, 5).fill(T.accent);

  let textX = M;
  if (id.logo) {
    try {
      doc.save().roundedRect(M, 28, 68, 68, 12).fill("#ffffff").restore();
      doc.image(id.logo, M + 6, 34, { fit: [56, 56], align: "center", valign: "center" });
      textX = M + 68 + 16;
    } catch { textX = M; }
  }
  const nameW = colX - textX - 24;
  // Gym name: biggest font (down to 13pt) at which it fits in two lines - nothing is cut.
  let nameFs = textX > M ? 22 : 26;
  for (; nameFs > 13; nameFs -= 1) {
    doc.font("Helvetica-Bold").fontSize(nameFs);
    if (doc.heightOfString(id.name, { width: nameW }) <= doc.currentLineHeight() * 2 + 1) break;
  }
  doc.font("Helvetica-Bold").fontSize(nameFs);
  const nameH = doc.heightOfString(id.name, { width: nameW });
  doc.fillColor("#ffffff").text(id.name, textX, 34, { width: nameW });
  const afterName = 34 + nameH + 6;
  caps(doc, "Personal workout plan", textX, afterName, { color: "#fca5a5", size: 9, width: 250 });
  doc.rect(textX, afterName + 18, 34, 3).fill(T.accent);
  if (contact.length) {
    doc.moveTo(colX - 14, 28).lineTo(colX - 14, headerH - 18).lineWidth(0.6).strokeColor("#334155").stroke();
    let cy = 30;
    contact.forEach(([k, v]) => {
      caps(doc, k, colX, cy, { color: T.faint, size: 6.5, width: colW });
      if (k === "Address") doc.font("Helvetica").fontSize(8.5).fillColor("#ffffff").text(v, colX, cy + 9, { width: colW, height: 34, ellipsis: true });
      else fitLine(doc, v, colX, cy + 9, { font: "Helvetica", size: 8.5, minSize: 5.5, color: "#ffffff", width: colW });
      cy += itemH(k, v);
    });
  }
  y = headerH + 24;

  /* ---------- plan title, member, tags ---------- */
  if (member) {
    caps(doc, "Prepared for", M, y, { color: T.muted, size: 7, width: 200 });
    line1(doc, member.name, M, y + 10, { font: "Helvetica-Bold", size: 13, color: T.accent, width: CW });
    y += 32;
  }
  doc.font("Helvetica-Bold").fontSize(22).fillColor(T.ink);
  const titleH = Math.min(doc.heightOfString(plan.name, { width: CW }), 56);
  doc.text(plan.name, M, y, { width: CW, height: 56, ellipsis: true });
  y += titleH + 10;

  let px = M;
  [plan.goal && `Goal: ${label(plan.goal)}`, plan.level && `Level: ${label(plan.level)}`, plan.duration_weeks && `${plan.duration_weeks} weeks`]
    .filter(Boolean).forEach((t) => { px += pill(doc, t, px, y, { bg: T.accentSoft, fg: T.accent, border: T.accentSoft, size: 8.5, h: 20 }) + 6; });
  if (px > M) y += 30;

  /* ---------- summary tiles ---------- */
  const totalEx = days.reduce((n, d) => n + (d.exercises || []).length, 0);
  const totalSets = days.reduce((n, d) => n + (d.exercises || []).reduce((a, e) => a + (e.sets || 0), 0), 0);
  const trainingDays = days.filter((d) => (d.exercises || []).length).length;
  const tiles = [["Days / week", String(days.length)], ["Training days", String(trainingDays)], ["Exercises", String(totalEx)], ["Total sets", String(totalSets)]];
  const tw = (CW - 3 * 8) / 4;
  tiles.forEach(([k, v], i) => {
    const tx = M + i * (tw + 8);
    doc.save().roundedRect(tx, y, tw, 46, 8).fillAndStroke(T.soft, T.line).restore();
    line1(doc, v, tx + 12, y + 8, { font: "Helvetica-Bold", size: 18, color: T.ink, width: tw - 20 });
    caps(doc, k, tx + 12, y + 31, { color: T.muted, size: 6.5, width: tw - 20 });
  });
  y += 46 + 22;

  /* ---------- page helpers ---------- */
  const newPage = () => {
    doc.addPage({ size: "A4", margin: 0 });
    doc.rect(0, 0, PW, 30).fill(T.ink);
    doc.rect(0, 0, PW, 3).fill(T.accent);
    line1(doc, id.name, M, 11, { font: "Helvetica-Bold", size: 10, color: "#ffffff", width: 280 });
    line1(doc, plan.name, PW - M - 220, 12, { size: 8.5, color: T.faint, width: 220, align: "right" });
    y = 30 + 24;
  };
  const ensure = (h) => { if (y + h > LIMIT) newPage(); };

  const C = { n: M + 12, ex: M + 36, sets: M + 292, reps: M + 352, rest: M + 428 };
  const tableHead = () => {
    doc.rect(M, y, CW, 22).fill(T.soft);
    doc.moveTo(M, y + 22).lineTo(M + CW, y + 22).lineWidth(0.6).strokeColor(T.line).stroke();
    caps(doc, "#", C.n, y + 8, { color: T.muted, size: 7, width: 20 });
    caps(doc, "Exercise", C.ex, y + 8, { color: T.muted, size: 7, width: 200 });
    caps(doc, "Sets", C.sets, y + 8, { color: T.muted, size: 7, width: 56, align: "center" });
    caps(doc, "Reps", C.reps, y + 8, { color: T.muted, size: 7, width: 66, align: "center" });
    caps(doc, "Rest", C.rest, y + 8, { color: T.muted, size: 7, width: 60, align: "center" });
    y += 22;
  };
  const dayBar = (d, cont) => {
    doc.save().roundedRect(M, y, CW, 34, 8).fill(T.ink).restore();
    doc.circle(M + 21, y + 17, 11).fill(T.accent);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff").text(String(d.day_number), M + 10, y + 12, { width: 22, align: "center", lineBreak: false });
    const focus = (d.focus || []).map((f) => String(f).replace(/_/g, " ")).join("  -  ").toUpperCase();
    const focusW = focus ? 190 : 0;
    line1(doc, `${d.title || `Day ${d.day_number}`}${cont ? "  (continued)" : ""}`, M + 42, y + 11, { font: "Helvetica-Bold", size: 11.5, color: "#ffffff", width: CW - 60 - focusW });
    if (focus) line1(doc, focus, M + CW - 14 - focusW, y + 14, { font: "Helvetica-Bold", size: 7, color: "#fca5a5", width: focusW, align: "right" });
    y += 34;
  };

  /* ---------- days ---------- */
  days.forEach((d) => {
    const ex = d.exercises || [];
    ensure(34 + (ex.length ? 22 + 30 : 40));
    dayBar(d, false);

    if (!ex.length) {
      doc.rect(M, y, CW, 36).fill(T.soft);
      line1(doc, "Rest and recovery day. Light walk, stretching, good sleep and plenty of water.", M + 14, y + 13, { size: 9, color: T.muted, width: CW - 28 });
      y += 36;
    } else {
      tableHead();
      ex.forEach((e, i) => {
        const sub = [e.body_part && label(e.body_part), e.notes].filter(Boolean).join("   |   ");
        doc.font("Helvetica-Bold").fontSize(9.5);
        const nameH2 = Math.min(doc.heightOfString(e.name, { width: 248 }), 28);
        doc.font("Helvetica").fontSize(7.5);
        const subH = sub ? Math.min(doc.heightOfString(sub, { width: 248 }), 22) + 2 : 0;
        const rowH = Math.max(26, nameH2 + subH + 14);
        if (y + rowH > LIMIT) { newPage(); dayBar(d, true); tableHead(); }
        if (i % 2 === 1) doc.rect(M, y, CW, rowH).fill(T.soft);
        doc.moveTo(M, y + rowH).lineTo(M + CW, y + rowH).lineWidth(0.4).strokeColor(T.line).stroke();
        const mid = y + (rowH - 9) / 2;
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.accent).text(String(i + 1), C.n, mid, { width: 20, lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor(T.text).text(e.name, C.ex, y + 7, { width: 248, height: 28, ellipsis: true });
        if (sub) doc.font("Helvetica").fontSize(7.5).fillColor(T.muted).text(sub, C.ex, y + 7 + nameH2 + 2, { width: 248, height: 22, ellipsis: true });
        const cell = (txt, x, w, strong) => doc.font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(9.5).fillColor(strong ? T.ink : T.body)
          .text(txt, x, mid, { width: w, align: "center", lineBreak: false });
        cell(e.sets ? String(e.sets) : "-", C.sets, 56, true);
        cell(e.reps || "-", C.reps, 66, true);
        cell(e.rest_sec ? `${e.rest_sec}s` : "-", C.rest, 60, false);
        y += rowH;
      });
    }

    if (d.notes) {
      doc.font("Helvetica-Oblique").fontSize(8.5);
      const nh = doc.heightOfString(d.notes, { width: CW - 28 }) + 16;
      ensure(nh + 6);
      y += 6;
      doc.rect(M, y, CW, nh).fill(T.accentSoft);
      doc.rect(M, y, 3, nh).fill(T.accent);
      doc.font("Helvetica-Oblique").fontSize(8.5).fillColor("#7f1d1d").text(d.notes, M + 14, y + 8, { width: CW - 28 });
      y += nh;
    }
    y += 20;
  });

  /* ---------- trainer notes + sign-off ---------- */
  if (plan.notes) {
    doc.font("Helvetica").fontSize(9);
    const nh = doc.heightOfString(plan.notes, { width: CW - 32 }) + 34;
    ensure(nh + 6);
    doc.save().roundedRect(M, y, CW, nh, 8).fillAndStroke(T.soft, T.line).restore();
    caps(doc, "Trainer's notes", M + 16, y + 12, { color: T.accent, size: 7.5, width: 200 });
    doc.font("Helvetica").fontSize(9).fillColor(T.body).text(plan.notes, M + 16, y + 26, { width: CW - 32 });
    y += nh + 16;
  }
  const signH = 52;
  ensure(signH + 6);
  doc.save().roundedRect(M, y, CW, signH, 10).fill(T.ink).restore();
  doc.rect(M, y + 12, 4, signH - 24).fill(T.accent);
  line1(doc, "Stay consistent. Results follow.", M + 20, y + 11, { font: "Helvetica-Bold", size: 12, color: "#ffffff", width: CW - 40 });
  line1(doc, ["Questions about your plan?", id.owner && `Ask ${id.owner}`, id.phone].filter(Boolean).join("  |  "), M + 20, y + 29, { size: 8.5, color: T.faint, width: CW - 40 });

  /* ---------- footer on every page ---------- */
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0; // footer sits inside the bottom margin; stop pdfkit adding a page
    const fy = PH - 38;
    doc.moveTo(M, fy).lineTo(PW - M, fy).lineWidth(0.5).strokeColor(T.line).stroke();
    fitLine(doc, [id.name, id.phone, id.email].filter(Boolean).join("   |   "), M, fy + 9, { size: 7.5, minSize: 5, color: T.muted, width: CW - 90 });
    line1(doc, `Page ${i + 1} of ${range.count}`, PW - M - 70, fy + 9, { font: "Helvetica-Bold", size: 7.5, color: T.muted, width: 70, align: "right" });
  }
  doc.end();
}


module.exports = {
    listExercises, createExercise, updateExercise, deleteExercise,
    listPlans, getPlan, createPlan, updatePlan, deletePlan, assign, installStarters, pdfByToken
  };