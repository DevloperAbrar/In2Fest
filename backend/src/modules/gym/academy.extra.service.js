// Sports Academy / Studio: drills library, events (tournaments, camps, exams) and certificates.
const PDFDocument = require("pdfkit");
const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const { GymMember } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const D = require("../../config/academyDisciplines");
const DR = require("../../config/academyDrills");
const { GymDrill, GymEvent, GymEventParticipant } = require("./academy.models");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_TYPES = ["tournament", "match", "camp", "trial", "exam", "recital", "workshop", "other"];
const EVENT_STATUS = ["scheduled", "completed", "cancelled"];
const MAX_DRILLS = 300;
const MAX_EVENTS = 1000;

const blank = (v) => v === undefined || v === null || String(v).trim() === "";
const text = (v, max) => String(v === undefined || v === null ? "" : v).trim().slice(0, max);
const needId = (id, label) => {
  if (!UUID_RE.test(String(id))) throw new AppError(`${label} not found`, 404);
  return String(id);
};
function groupOf(variant) {
  const v = D.VARIANTS[variant];
  if (!v) throw new AppError("This section is available for Sports Academy and Studio accounts only", 403);
  return v.group;
}

/* ------------------------------ drills ------------------------------ */

function drillFields(b, creating, group) {
  const o = {};
  if (creating || b.title !== undefined) {
    const t = text(b.title, 100);
    if (!t) throw new AppError("Title is required", 400);
    o.title = t;
  }
  if (b.discipline !== undefined) {
    const d = text(b.discipline, 30);
    if (d && !D.isAllowed(group, d)) throw new AppError("Choose a valid sport or class type", 400);
    o.discipline = d || null;
  }
  if (b.category !== undefined) o.category = text(b.category, 40) || null;
  if (b.minutes !== undefined) o.minutes = blank(b.minutes) ? null : U.num(b.minutes, "Minutes", { min: 1, max: 300, int: true });
  if (b.equipment !== undefined) o.equipment = text(b.equipment, 120) || null;
  if (b.instructions !== undefined) o.instructions = text(b.instructions, 3000) || null;
  return o;
}

async function listDrills(venueId, variant, q) {
  const group = groupOf(variant);
  const disc = text(q && q.discipline, 30);
  if (disc && !D.isAllowed(group, disc)) throw new AppError("Choose a valid sport or class type", 400);
  const custom = await GymDrill.findAll({
    where: { venue_id: venueId, ...(disc ? { [Op.or]: [{ discipline: disc }, { discipline: null }] } : {}) },
    order: [["title", "ASC"]],
    limit: 500
  });
  return { builtin: DR.list(group, disc), custom: custom.map((c) => ({ ...c.toJSON(), builtin: false })) };
}

async function loadDrill(venueId, id) {
  const row = UUID_RE.test(String(id)) ? await GymDrill.findOne({ where: { id, venue_id: venueId } }) : null;
  if (!row) throw new AppError("Drill not found", 404);
  return row;
}

async function createDrill(venueId, variant, body) {
  const o = drillFields(body || {}, true, groupOf(variant));
  if ((await GymDrill.count({ where: { venue_id: venueId } })) >= MAX_DRILLS) throw new AppError(`You can add up to ${MAX_DRILLS} drills`, 400);
  return GymDrill.create({ ...o, venue_id: venueId });
}

async function updateDrill(venueId, variant, id, body) {
  const row = await loadDrill(venueId, id);
  await row.update(drillFields(body || {}, false, groupOf(variant)));
  return row;
}

async function deleteDrill(venueId, id) {
  const row = await loadDrill(venueId, id);
  await row.destroy();
  return { deleted: true };
}

/* ------------------------------ events ------------------------------ */

function eventFields(b, creating, group) {
  const o = {};
  if (creating || b.title !== undefined) {
    const t = text(b.title, 120);
    if (!t) throw new AppError("Title is required", 400);
    o.title = t;
  }
  if (creating || b.type !== undefined) {
    const t = text(b.type || "other", 20);
    if (!EVENT_TYPES.includes(t)) throw new AppError("Invalid event type", 400);
    o.type = t;
  }
  if (b.discipline !== undefined) {
    const d = text(b.discipline, 30);
    if (d && !D.isAllowed(group, d)) throw new AppError("Choose a valid sport or class type", 400);
    o.discipline = d || null;
  }
  if (creating || b.event_date !== undefined) {
    const d = String(b.event_date || "");
    if (!U.isYmd(d) || Math.abs(U.diffDays(U.todayIST(), d)) > 1100) throw new AppError("Enter a valid date", 400);
    o.event_date = d;
  }
  if (b.location !== undefined) o.location = text(b.location, 120) || null;
  if (b.fee !== undefined) o.fee = blank(b.fee) ? 0 : U.num(b.fee, "Fee", { min: 0, max: 1000000 });
  if (b.description !== undefined) o.description = text(b.description, 2000) || null;
  if (b.status !== undefined) {
    const s = text(b.status, 12);
    if (!EVENT_STATUS.includes(s)) throw new AppError("Invalid status", 400);
    o.status = s;
  }
  return o;
}

async function loadEvent(venueId, id) {
  const row = UUID_RE.test(String(id)) ? await GymEvent.findOne({ where: { id, venue_id: venueId } }) : null;
  if (!row) throw new AppError("Event not found", 404);
  return row;
}

async function listEvents(venueId) {
  const [rows, counts] = await Promise.all([
    GymEvent.findAll({ where: { venue_id: venueId }, order: [["event_date", "DESC"], ["createdAt", "DESC"]], limit: 200 }),
    sequelize.query(
      `SELECT p.event_id, COUNT(*)::int AS total
         FROM gym_event_participants p
         JOIN gym_members m ON m.id = p.member_id AND m.venue_id = p.venue_id
        WHERE p.venue_id = :v AND m.is_archived = false
        GROUP BY p.event_id`,
      { replacements: { v: venueId }, type: QueryTypes.SELECT }
    )
  ]);
  const byEvent = new Map(counts.map((r) => [r.event_id, r.total]));
  return rows.map((e) => ({ ...e.toJSON(), participant_count: byEvent.get(e.id) || 0 }));
}

async function eventDetail(venueId, id) {
  const event = await loadEvent(venueId, id);
  const participants = await sequelize.query(
    `SELECT m.id, m.name, m.member_code, m.phone, p.result, p.notes, p.fee_paid
       FROM gym_event_participants p
       JOIN gym_members m ON m.id = p.member_id AND m.venue_id = p.venue_id
      WHERE p.venue_id = :v AND p.event_id = :e AND m.is_archived = false
      ORDER BY m.name`,
    { replacements: { v: venueId, e: event.id }, type: QueryTypes.SELECT }
  );
  return { event: event.toJSON(), participants };
}

async function createEvent(venueId, variant, body) {
  const o = eventFields(body || {}, true, groupOf(variant));
  if ((await GymEvent.count({ where: { venue_id: venueId } })) >= MAX_EVENTS) throw new AppError("Event limit reached", 400);
  return GymEvent.create({ ...o, venue_id: venueId });
}

async function updateEvent(venueId, variant, id, body) {
  const row = await loadEvent(venueId, id);
  await row.update(eventFields(body || {}, false, groupOf(variant)));
  return row;
}

async function removeEvent(venueId, id) {
  await sequelize.transaction(async (tx) => {
    const row = UUID_RE.test(String(id)) ? await GymEvent.findOne({ where: { id, venue_id: venueId }, transaction: tx }) : null;
    if (!row) throw new AppError("Event not found", 404);
    await GymEventParticipant.destroy({ where: { event_id: row.id, venue_id: venueId }, transaction: tx });
    await row.destroy({ transaction: tx });
  });
  return { deleted: true };
}

async function addParticipants(venueId, id, memberIds) {
  const event = await loadEvent(venueId, id);
  const ids = [...new Set((Array.isArray(memberIds) ? memberIds : []).map(String))];
  if (!ids.length) throw new AppError("Choose at least one student", 400);
  if (ids.length > 200) throw new AppError("Add up to 200 students at a time", 400);
  if (ids.some((m) => !UUID_RE.test(m))) throw new AppError("Student not found", 404);
  const found = await GymMember.findAll({ where: { id: ids, venue_id: venueId, is_archived: false }, attributes: ["id"] });
  if (found.length !== ids.length) throw new AppError("One or more students were not found", 400);
  await GymEventParticipant.bulkCreate(
    ids.map((member_id) => ({ event_id: event.id, member_id, venue_id: venueId, fee_paid: Number(event.fee) === 0 })),
    { ignoreDuplicates: true }
  );
  return { added: ids.length };
}

async function loadParticipant(venueId, eventId, memberId) {
  const row = UUID_RE.test(String(eventId)) && UUID_RE.test(String(memberId))
    ? await GymEventParticipant.findOne({ where: { event_id: eventId, member_id: memberId, venue_id: venueId } })
    : null;
  if (!row) throw new AppError("Entry not found", 404);
  return row;
}

async function updateParticipant(venueId, eventId, memberId, body) {
  const row = await loadParticipant(venueId, eventId, memberId);
  const b = body || {};
  const patch = {};
  if (b.result !== undefined) patch.result = text(b.result, 60) || null;
  if (b.notes !== undefined) patch.notes = text(b.notes, 200) || null;
  if (b.fee_paid !== undefined) patch.fee_paid = !!b.fee_paid;
  await row.update(patch);
  return { updated: true };
}

async function removeParticipant(venueId, eventId, memberId) {
  const row = await loadParticipant(venueId, eventId, memberId);
  await row.destroy();
  return { removed: true };
}

// Certificate PDF for one student in one event (participation, or achievement when a result is set).
async function certificatePdf(venue, eventId, memberId, res) {
  const event = await loadEvent(venue.id, eventId);
  const part = await loadParticipant(venue.id, event.id, memberId);
  const member = await GymMember.findOne({ where: { id: memberId, venue_id: venue.id } });
  if (!member) throw new AppError("Student not found", 404);

  const when = new Date(`${event.event_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const safe = String(member.name).replace(/[^\w-]+/g, "_").slice(0, 40) || "student";

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0, info: { Title: `Certificate - ${member.name}`, Author: venue.name } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="certificate-${safe}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;
  const H = doc.page.height;
  doc.rect(20, 20, W - 40, H - 40).lineWidth(3).stroke("#1e3a5f");
  doc.rect(30, 30, W - 60, H - 60).lineWidth(1).stroke("#94a3b8");

  doc.font("Helvetica-Bold").fontSize(15).fillColor("#64748b").text(String(venue.name || "").toUpperCase(), 60, 62, { width: W - 120, align: "center" });
  doc.font("Helvetica-Bold").fontSize(34).fillColor("#1e3a5f").text(part.result ? "CERTIFICATE OF ACHIEVEMENT" : "CERTIFICATE OF PARTICIPATION", 60, 100, { width: W - 120, align: "center" });
  doc.font("Helvetica").fontSize(14).fillColor("#475569").text("This is to certify that", 60, 175, { width: W - 120, align: "center" });
  doc.font("Helvetica-Bold").fontSize(32).fillColor("#0f172a").text(member.name, 60, 205, { width: W - 120, align: "center" });
  doc.font("Helvetica").fontSize(15).fillColor("#334155").text(
    part.result ? `has achieved "${part.result}" in` : "has successfully participated in",
    60, 262, { width: W - 120, align: "center" }
  );
  doc.font("Helvetica-Bold").fontSize(24).fillColor("#1e3a5f").text(event.title, 60, 295, { width: W - 120, align: "center" });
  doc.font("Helvetica").fontSize(13).fillColor("#475569").text(`${when}${event.location ? `  |  ${event.location}` : ""}`, 60, 340, { width: W - 120, align: "center" });

  doc.moveTo(W - 270, H - 95).lineTo(W - 80, H - 95).lineWidth(1).stroke("#64748b");
  doc.font("Helvetica").fontSize(11).fillColor("#64748b").text("Authorised signatory", W - 270, H - 88, { width: 190, align: "center" });
  doc.end();
}

module.exports = {
  listDrills, createDrill, updateDrill, deleteDrill,
  listEvents, eventDetail, createEvent, updateEvent, removeEvent,
  addParticipants, updateParticipant, removeParticipant, certificatePdf
};