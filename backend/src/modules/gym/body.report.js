// Gym "Body Measurement": downloadable PDF report for ONE member (A4, multi-page).
// Read-only. Uses the same data as the screen (body.service) and the same branding as receipts.
// The PDF is built fully in memory first, so a failure returns a normal JSON error, not a broken file.
const PDFDocument = require("pdfkit");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const B = require("../../config/bodyMetrics");
const svc = require("./body.service");
const { gymIdentity, loadLogo, pill } = require("./gym.brand");
const { PAL: C, put, putFit, para, paraH, hline, drawWave, drawTopStrip } = require("../billing/pdf.theme");

const PW = 595.28;
const PH = 841.89;
const M = 36;
const CW = PW - M * 2;
const LIMIT = PH - 58;
const COLS = { test: 168, first: 62, latest: 70, change: 112 };
COLS.trend = CW - (COLS.test + COLS.first + COLS.latest + COLS.change);
const X = { test: M, first: M + COLS.test, latest: M + COLS.test + COLS.first, change: M + COLS.test + COLS.first + COLS.latest };
X.trend = X.change + COLS.change;
const HEAD_H = 24;
const ROW_H = 34;
const AMBER = "#b45309";
const GROUP_ORDER = [["size", "Body size"], ["health", "Health & composition"], ["cardio", "Cardio & treadmill"], ["strength", "Strength & fitness"], ["derived", "Calculated"]];

const toneColor = (t) => (t === "good" ? C.green : t === "bad" ? C.red : t === "warn" ? AMBER : C.muted);
const stateColor = (s) => (s === "better" ? C.green : s === "worse" ? C.red : C.muted);

// The built-in PDF fonts only know Latin characters; anything else is dropped (names fall back).
const clean = (s, fallback = "") => {
  const t = String(s == null ? "" : s)
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "").replace(/\s+/g, " ").trim();
  return t || fallback;
};
const fmtNum = (n, d = 2) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: d });

function fmtTime(sec) {
  const s = Math.round(sec * 10) / 10;
  if (s < 60) return `${fmtNum(s, 1)} s`;
  const m = Math.floor(s / 60);
  const rest = Math.round((s - m * 60) * 10) / 10;
  return `${m}:${String(Math.floor(rest)).padStart(2, "0")}${rest % 1 ? `.${Math.round((rest % 1) * 10)}` : ""}`;
}

function fmtV(s, v, unit) {
  if (s.kind === "length") return unit === "in" ? `${fmtNum(v / B.CM_PER_IN, 1)} in` : `${fmtNum(v, 1)} cm`;
  if (s.kind === "time") return fmtTime(v);
  const u = clean(s.unit);
  const n = fmtNum(v, s.decimals === 0 ? 0 : s.decimals || 1);
  return !u ? n : u === "%" ? `${n}%` : `${n} ${u}`;
}

/* ------------------------------ rows ------------------------------ */

// Blood pressure is shown as ONE row (systolic/diastolic) instead of two.
function buildRows(view, unit) {
  const female = view.member.sex === "female";
  const rows = [];
  const bySeries = new Map(view.series.map((s) => [s.key, s]));
  view.series.forEach((s) => {
    if (s.key === "bp_sys" || s.key === "bp_dia") return;
    rows.push({ group: s.group, s, label: female && s.label_f ? s.label_f : s.label, fv: (v) => fmtV(s, v, unit) });
  });
  const sys = bySeries.get("bp_sys");
  const dia = bySeries.get("bp_dia");
  if (sys && dia) {
    const dmap = new Map(dia.points.map((p) => [p.date, p.value]));
    const pts = sys.points.filter((p) => dmap.has(p.date)).map((p) => ({ ...p, value: p.value, dia: dmap.get(p.date) }));
    if (pts.length) {
      const fake = { ...sys, points: pts, first: pts[0], latest: pts[pts.length - 1], derived: false };
      rows.push({ group: "health", s: fake, label: "Blood pressure", bp: true, fv: (v, p) => `${Math.round(v)}/${Math.round(p ? p.dia : 0)}` });
    }
  }
  return rows;
}

/* ------------------------------ drawing pieces ------------------------------ */

function drawSpark(doc, values, x, y, w, h, color) {
  doc.save();
  const pts = values.slice(-12);
  const midY = y + h / 2;
  if (pts.length === 1) { doc.circle(x + w / 2, midY, 2.6).fill(color); doc.restore(); return; }
  const min = Math.min(...pts);
  const span = Math.max(...pts) - min;
  const px = (i) => x + 3 + (i * (w - 6)) / (pts.length - 1);
  const py = (v) => (span === 0 ? midY : y + h - 3 - ((v - min) / span) * (h - 6));
  doc.moveTo(x, y + h).lineTo(x + w, y + h).lineWidth(0.5).strokeColor(C.line).stroke();
  doc.lineWidth(1.6).lineJoin("round").lineCap("round").strokeColor(color);
  pts.forEach((v, i) => (i === 0 ? doc.moveTo(px(i), py(v)) : doc.lineTo(px(i), py(v))));
  doc.stroke();
  doc.circle(px(pts.length - 1), py(pts[pts.length - 1]), 2.6).fill(color);
  doc.restore();
}

function drawArrow(doc, up, x, y, color) {
  doc.save();
  if (up) doc.polygon([x, y + 7], [x + 8, y + 7], [x + 4, y]).fill(color);
  else doc.polygon([x, y], [x + 8, y], [x + 4, y + 7]).fill(color);
  doc.restore();
}

function drawTableHead(doc, y) {
  doc.rect(M, y, CW, HEAD_H).fill(C.navy);
  const h = { font: "Helvetica-Bold", size: 8, color: C.white, spacing: 0.6 };
  put(doc, "MEASURE", X.test + 10, y + 8, h);
  put(doc, "FIRST", X.first, y + 8, { ...h, width: COLS.first, align: "center" });
  put(doc, "LATEST", X.latest, y + 8, { ...h, width: COLS.latest, align: "center" });
  put(doc, "CHANGE", X.change + 10, y + 8, h);
  put(doc, "TREND", X.trend, y + 8, { ...h, width: COLS.trend, align: "center" });
  return y + HEAD_H;
}

function drawRow(doc, row, y, zebra, unit) {
  const { s } = row;
  if (zebra) doc.rect(M, y, CW, ROW_H).fill(C.soft);
  const color = stateColor(s.state);
  const n = s.points.length;
  const mid = y + (ROW_H - 10) / 2;
  putFit(doc, clean(row.label, "Reading"), X.test + 10, y + 6, COLS.test - 18, { font: "Helvetica-Bold", size: 9.5, minSize: 7, color: C.ink });
  putFit(doc, `Last: ${U.fmtDate(s.latest.date)}  |  ${n} record${n === 1 ? "" : "s"}`, X.test + 10, y + 20, COLS.test - 18, { size: 7.5, minSize: 6, color: C.muted });
  putFit(doc, row.fv(s.first.value, s.first), X.first + 4, mid, COLS.first - 8, { size: 9, color: C.text, align: "center" });
  putFit(doc, row.fv(s.latest.value, s.latest), X.latest + 4, y + (ROW_H - 11) / 2, COLS.latest - 8, { font: "Helvetica-Bold", size: 10, minSize: 7, color: C.ink, align: "center" });

  const cx = X.change + 10;
  if (s.state === "first") put(doc, "First record", cx, mid, { size: 8.5, color: C.muted });
  else if (s.state === "same") put(doc, "No change", cx, mid, { size: 8.5, color: C.muted });
  else {
    drawArrow(doc, s.delta > 0, cx, y + 8, color);
    const abs = Math.abs(s.delta);
    const dTxt = s.kind === "length" && unit === "in" ? `${fmtNum(abs / B.CM_PER_IN, 1)} in` : row.bp ? `${Math.round(abs)}` : fmtV(s, abs, unit);
    putFit(doc, `${s.delta > 0 ? "+" : "-"}${dTxt}`, cx + 13, y + 6, COLS.change - 24, { font: "Helvetica-Bold", size: 9, minSize: 6.5, color });
    const tag = s.state === "better" ? "Improved" : s.state === "worse" ? "Declined" : "Changed";
    putFit(doc, `${tag}${s.pct !== null ? `  ${s.pct >= 100 ? Math.round(s.pct) : s.pct.toFixed(1)}%` : ""}`, cx + 13, y + 20, COLS.change - 24, { size: 7.5, minSize: 6, color });
  }
  drawSpark(doc, s.points.map((p) => p.value), X.trend + 8, y + 7, COLS.trend - 16, ROW_H - 14, color);
  hline(doc, M, M + CW, y + ROW_H, C.line, 0.5);
}

function drawMemberCard(doc, y, d) {
  const H = 100;
  doc.save().roundedRect(M, y, CW, H, 10).lineWidth(0.8).fillAndStroke(C.soft, C.line).restore();
  const px = M + 14, py = y + 14, S = 72;
  let drew = false;
  if (d.photo) {
    try {
      doc.save();
      doc.roundedRect(px, py, S, S, 10).clip();
      doc.image(d.photo, px, py, { cover: [S, S], align: "center", valign: "center" });
      drew = true;
    } catch { drew = false; } finally { doc.restore(); }
  }
  if (!drew) {
    doc.save().roundedRect(px, py, S, S, 10).fill(C.navySoft).restore();
    const ini = clean(d.name).split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "M";
    put(doc, ini, px, py + S / 2 - 14, { font: "Helvetica-Bold", size: 28, color: C.navy, width: S, align: "center" });
  }
  const rx = px + S + 18;
  const rw = CW - (rx - M) - 14;
  putFit(doc, clean(d.name, "Member"), rx, y + 12, rw, { font: "Helvetica-Bold", size: 17, minSize: 11, color: C.ink });
  let pxx = rx;
  [d.genderLabel].filter(Boolean).forEach((t) => {
    pxx += pill(doc, clean(t), pxx, y + 36, { bg: C.navySoft, fg: C.navy, border: C.navySoft, size: 8, h: 18 }) + 6;
  });
  const colW = rw / 3;
  d.details.forEach((cell, i) => {
    const cx = rx + (i % 3) * colW;
    const cy = y + 60 + Math.floor(i / 3) * 21;
    put(doc, cell.label.toUpperCase(), cx, cy - 2, { font: "Helvetica-Bold", size: 6.5, color: C.muted, spacing: 0.8 });
    putFit(doc, clean(cell.value, "-"), cx, cy + 7, colW - 8, { font: "Helvetica-Bold", size: 9, minSize: 6.5, color: C.ink });
  });
  return y + H;
}

function drawTiles(doc, y, tiles) {
  const gap = 10;
  const w = (CW - gap * (tiles.length - 1)) / tiles.length;
  const h = 62;
  tiles.forEach((t, i) => {
    const x = M + i * (w + gap);
    const col = toneColor(t.tone);
    doc.save().roundedRect(x, y, w, h, 9).lineWidth(0.8).fillAndStroke(C.white, C.line).restore();
    doc.rect(x, y + 12, 3, h - 24).fill(t.tone ? col : C.navy);
    putFit(doc, t.value, x + 14, y + 10, w - 26, { font: "Helvetica-Bold", size: 20, minSize: 10, color: C.navy });
    put(doc, t.label.toUpperCase(), x + 14, y + 36, { font: "Helvetica-Bold", size: 6.8, color: C.muted, spacing: 0.7 });
    putFit(doc, t.sub || "", x + 14, y + 47, w - 26, { font: t.tone ? "Helvetica-Bold" : "Helvetica", size: 7.5, minSize: 6, color: t.tone ? col : C.muted });
  });
  return y + h;
}

function drawWeightChart(doc, y, pts, unitNote) {
  const H = 132;
  doc.save().roundedRect(M, y, CW, H, 10).lineWidth(0.8).fillAndStroke(C.white, C.line).restore();
  put(doc, "WEIGHT TREND", M + 14, y + 12, { font: "Helvetica-Bold", size: 8, color: C.navy, spacing: 0.9 });
  put(doc, unitNote, M, y + 12, { size: 7.5, color: C.muted, width: CW - 14, align: "right" });
  const gx = M + 44, gy = y + 32, gw = CW - 44 - 26, gh = H - 32 - 26;
  const vals = pts.map((p) => p.value);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.15, 0.5);
  lo -= pad; hi += pad;
  for (let i = 0; i <= 2; i++) {
    const ly = gy + (gh * i) / 2;
    hline(doc, gx, gx + gw, ly, C.line, 0.5);
    put(doc, fmtNum(hi - ((hi - lo) * i) / 2, 1), M + 10, ly - 3.5, { size: 7, color: C.muted, width: 30, align: "right" });
  }
  const t0 = new Date(`${pts[0].date}T00:00:00Z`).getTime();
  const t1 = new Date(`${pts[pts.length - 1].date}T00:00:00Z`).getTime();
  const span = Math.max(t1 - t0, 1);
  const px = (p) => gx + 6 + ((new Date(`${p.date}T00:00:00Z`).getTime() - t0) / span) * (gw - 12);
  const py = (v) => gy + gh - ((v - lo) / (hi - lo)) * gh;
  doc.save().lineWidth(1.8).lineJoin("round").lineCap("round").strokeColor(C.navy2);
  pts.forEach((p, i) => (i === 0 ? doc.moveTo(px(p), py(p.value)) : doc.lineTo(px(p), py(p.value))));
  doc.stroke().restore();
  pts.forEach((p, i) => {
    const last = i === pts.length - 1;
    doc.circle(px(p), py(p.value), last ? 3.6 : 2.4).fill(last ? C.navy : C.navy2);
  });
  const lbl = (p, align) => put(doc, `${fmtNum(p.value, 1)} kg`, align === "right" ? px(p) - 56 : px(p) - 4, py(p.value) - 14, { font: "Helvetica-Bold", size: 8, color: C.ink, width: 60, align });
  lbl(pts[0], "left");
  if (pts.length > 1) lbl(pts[pts.length - 1], "right");
  put(doc, U.fmtDate(pts[0].date), gx, y + H - 16, { size: 7.5, color: C.muted });
  put(doc, U.fmtDate(pts[pts.length - 1].date), gx, y + H - 16, { size: 7.5, color: C.muted, width: gw, align: "right" });
  return y + H;
}

/* ------------------------------ health issues box (shared) ------------------------------ */

const LEVEL_TXT = { mild: "Mild", moderate: "Moderate", serious: "Serious" };
const levelColor = (l) => (l === "serious" ? C.red : l === "moderate" ? AMBER : C.green);

// Box listing the member's health issues / medical notes. Active ones first, resolved ones greyed out.
function issueLayout(doc, issues, width) {
  const innerW = width - 28 - 90;
  const items = issues.map((i) => ({ i, h: Math.max(paraH(doc, clean(i.text), innerW, "Helvetica", 9, 2), 11) + 7 }));
  return { items, innerW, width, boxH: 34 + items.reduce((a, b) => a + b.h, 0) };
}

function drawIssuesAt(doc, y, lay) {
  const { items, width, boxH, innerW } = lay;
  doc.save().roundedRect(M, y, width, boxH, 9).lineWidth(0.8).fillAndStroke("#fff7ed", "#fed7aa").restore();
  put(doc, "HEALTH ISSUES / MEDICAL NOTES", M + 14, y + 12, { font: "Helvetica-Bold", size: 8, color: AMBER, spacing: 0.9 });
  let ny = y + 28;
  items.forEach(({ i, h }) => {
    const col = i.resolved ? C.muted : levelColor(i.level);
    doc.circle(M + 18, ny + 5, 3).fill(col);
    para(doc, clean(i.text), M + 28, ny, innerW, { size: 9, color: i.resolved ? C.muted : C.ink, lineGap: 2 });
    put(doc, `${i.resolved ? "Resolved" : LEVEL_TXT[i.level] || "Mild"}  |  ${U.fmtDate(i.noted_on)}`, M + width - 14 - 86, ny + 1, { font: "Helvetica-Bold", size: 7.5, color: col, width: 86, align: "right" });
    ny += h;
  });
  return y + boxH;
}

/* ------------------------------ report ------------------------------ */

function drawReport(doc, d) {
  const { id } = d;
  let y = 0;
  const contHeader = () => {
    drawTopStrip(doc);
    put(doc, `Body Measurement Report  |  ${clean(d.name, "Member")}`, M, 22, { font: "Helvetica-Bold", size: 9, color: C.navy });
    put(doc, clean(id.name), M, 22, { size: 8.5, color: C.muted, width: CW, align: "right" });
    hline(doc, M, M + CW, 38, C.line, 0.6);
    return 52;
  };
  const newPage = () => { doc.addPage({ size: "A4", margin: 0 }); y = contHeader(); };
  const ensure = (h) => { if (y + h > LIMIT) { newPage(); return true; } return false; };

  /* wave header */
  const HEAD = 106;
  drawWave(doc, HEAD);
  let titleX = M;
  if (id.logo) {
    try {
      doc.save().roundedRect(M, 18, 52, 52, 10).fill("#ffffff").restore();
      doc.image(id.logo, M + 5, 23, { fit: [42, 42], align: "center", valign: "center" });
      titleX = M + 66;
    } catch { titleX = M; }
  }
  putFit(doc, clean(id.name, "Gym"), titleX, 22, 300, { font: "Helvetica-Bold", size: 24, minSize: 13, color: C.white });
  put(doc, "BODY MEASUREMENT REPORT", titleX, 54, { font: "Helvetica", size: 9.5, color: "#c7d8f7", spacing: 1.4 });
  put(doc, "REPORT DATE", PW - M - 150, 22, { font: "Helvetica", size: 7, color: "#c7d8f7", spacing: 1, width: 150, align: "right" });
  put(doc, U.fmtDate(d.today), PW - M - 150, 34, { font: "Helvetica-Bold", size: 12, color: C.white, width: 150, align: "right" });
  y = HEAD + 14;

  y = drawMemberCard(doc, y, d) + 14;
  y = drawTiles(doc, y, d.tiles) + 14;

  const wSeries = d.view.series.find((s) => s.key === "weight");
  if (wSeries && wSeries.points.length > 1) y = drawWeightChart(doc, y, wSeries.points, "kg") + 16;

  /* insights */
  const ins = d.view.snapshot.insights;
  if (ins.length) {
    const rowH = 19;
    const boxH = 34 + Math.ceil(ins.length / 2) * rowH;
    ensure(boxH + 8);
    doc.save().roundedRect(M, y, CW, boxH, 9).lineWidth(0.8).fillAndStroke(C.soft, C.line).restore();
    put(doc, "HEALTH SNAPSHOT  (based on the latest recorded values)", M + 14, y + 12, { font: "Helvetica-Bold", size: 8, color: C.navy, spacing: 0.7 });
    const half = (CW - 28) / 2;
    ins.forEach((it, i) => {
      const cx = M + 14 + (i % 2) * half;
      const cy = y + 30 + Math.floor(i / 2) * rowH;
      doc.circle(cx + 3, cy + 5, 3).fill(toneColor(it.tone));
      putFit(doc, `${clean(it.label)}:`, cx + 12, cy, half - 14, { font: "Helvetica-Bold", size: 8.5, minSize: 6.5, color: C.ink });
      doc.font("Helvetica-Bold").fontSize(8.5);
      const lw = doc.widthOfString(`${clean(it.label)}:`) + 18;
      putFit(doc, `${clean(it.value)}${it.note ? `  -  ${clean(it.note)}` : ""}`, cx + Math.min(lw, half * 0.5), cy, half - Math.min(lw, half * 0.5) - 8, { size: 8.5, minSize: 6, color: toneColor(it.tone) === C.muted ? C.text : toneColor(it.tone) });
    });
    y += boxH + 16;
  }

  /* health issues entered by the vendor */
  if (d.issues.length) {
    const lay = issueLayout(doc, d.issues, CW);
    ensure(lay.boxH + 6);
    y = drawIssuesAt(doc, y, lay) + 16;
  }

  /* tables */
  GROUP_ORDER.forEach(([gk, title]) => {
    const rows = d.rows.filter((r) => r.group === gk);
    if (!rows.length) return;
    const drawTitle = (suffix) => {
      doc.rect(M, y, 3, 15).fill(C.navy);
      put(doc, `${title}${suffix}`, M + 11, y + 2, { font: "Helvetica-Bold", size: 10.5, color: C.navy });
      put(doc, `${rows.length} reading${rows.length === 1 ? "" : "s"}`, M, y + 3, { size: 8, color: C.muted, width: CW, align: "right" });
      y += 22;
    };
    ensure(22 + HEAD_H + ROW_H);
    drawTitle("");
    y = drawTableHead(doc, y);
    rows.forEach((r, i) => {
      if (y + ROW_H > LIMIT) { newPage(); drawTitle(" (continued)"); y = drawTableHead(doc, y); }
      drawRow(doc, r, y, i % 2 === 1, d.unit);
      y += ROW_H;
    });
    y += 18;
  });

  /* trainer notes */
  if (d.notes.length) {
    const innerW = CW - 28;
    const heights = d.notes.map((n) => paraH(doc, `${U.fmtDate(n.date)}  -  ${n.text}`, innerW, "Helvetica", 9, 2) + 6);
    const boxH = 34 + heights.reduce((a, b) => a + b, 0);
    ensure(boxH + 6);
    doc.save().roundedRect(M, y, CW, boxH, 9).lineWidth(0.8).fillAndStroke(C.soft, C.line).restore();
    put(doc, "TRAINER NOTES", M + 14, y + 12, { font: "Helvetica-Bold", size: 8, color: C.navy, spacing: 0.9 });
    let ny = y + 28;
    d.notes.forEach((n, i) => { para(doc, `${U.fmtDate(n.date)}  -  ${n.text}`, M + 14, ny, innerW, { size: 9, color: C.text, lineGap: 2 }); ny += heights[i]; });
    y += boxH + 18;
  }

  /* how to read + sign-off */
  ensure(96);
  put(doc, "HOW TO READ THIS REPORT", M, y, { font: "Helvetica-Bold", size: 7.5, color: C.muted, spacing: 0.9 });
  y += 13;
  y += para(doc, "First is the earliest record (the weight and height saved in the member profile count as the starting point) and Latest is the most recent one. Change compares Latest with First. Green means the change is in the healthy direction, red means the opposite; size measurements are shown without colour because gaining muscle or losing fat can both be a goal. BMI and waist limits use the WHO Asia-Pacific ranges. Estimated body fat uses the US Navy method and is only a guide. This report is not medical advice.", M, y, CW - 190, { size: 8, color: C.muted, lineGap: 2 });
  const sx = PW - M - 170;
  const ly = Math.min(Math.max(y + 34, LIMIT - 40), LIMIT - 22);
  hline(doc, sx, sx + 170, ly, C.grid, 0.8);
  if (id.owner) putFit(doc, clean(id.owner), sx, ly + 5, 170, { font: "Helvetica-Bold", size: 9, minSize: 7, color: C.ink, align: "center" });
  put(doc, "Trainer / Authorised signatory", sx, ly + (id.owner ? 17 : 6), { size: 8, color: C.muted, width: 170, align: "center" });

  /* footer on every page */
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0;
    const fy = PH - 38;
    hline(doc, M, PW - M, fy, C.line, 0.5);
    putFit(doc, [clean(id.name), clean(id.phone), clean(id.email)].filter(Boolean).join("   |   "), M, fy + 9, CW - 90, { size: 7.5, minSize: 5, color: C.muted });
    put(doc, `Page ${i + 1} of ${range.count}`, PW - M - 70, fy + 9, { font: "Helvetica-Bold", size: 7.5, color: C.muted, width: 70, align: "right" });
  }
}

function toBuffer(doc, draw) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try { draw(); doc.end(); } catch (e) { reject(e); }
  });
}

/* ------------------------------ compare report (landscape) ------------------------------ */
// Side-by-side PDF of 2..8 saved records of ONE member, oldest on the left, with the change from
// the first to the last selected record. Same data as the on-screen compare (body.service.compareView).

const LW = 841.89;
const LH = 595.28;
const LCW = LW - M * 2;
const LLIMIT = LH - 50;
const C_HEAD = 24;
const C_ROW = 26;

function drawCompare(doc, d) {
  const { id, cmp, unit } = d;
  const n = cmp.columns.length;
  const labelW = 150;
  const changeW = 128;
  const colW = (LCW - labelW - changeW) / n;
  const xCol = (i) => M + labelW + i * colW;
  const xChange = M + labelW + n * colW;
  let y = 0;

  const contHeader = () => {
    drawTopStrip(doc);
    put(doc, `Body Progress Comparison  |  ${clean(cmp.member.name, "Member")}`, M, 22, { font: "Helvetica-Bold", size: 9, color: C.navy });
    put(doc, clean(id.name), M, 22, { size: 8.5, color: C.muted, width: LCW, align: "right" });
    hline(doc, M, M + LCW, 38, C.line, 0.6);
    return 52;
  };
  const newPage = () => { doc.addPage({ size: "A4", layout: "landscape", margin: 0 }); y = contHeader(); };
  const ensure = (h) => { if (y + h > LLIMIT) { newPage(); return true; } return false; };

  const tableHead = () => {
    doc.rect(M, y, LCW, C_HEAD).fill(C.navy);
    const hs = { font: "Helvetica-Bold", size: 7.5, color: C.white, spacing: 0.5 };
    put(doc, "MEASURE", M + 10, y + 8, hs);
    cmp.columns.forEach((c, i) => putFit(doc, U.fmtDate(c.date), xCol(i) + 2, y + 8, colW - 4, { font: "Helvetica-Bold", size: 7.5, minSize: 5.5, color: C.white, align: "center" }));
    put(doc, "CHANGE (FIRST TO LAST)", xChange + 8, y + 8, { ...hs, size: 6.5 });
    y += C_HEAD;
  };

  /* wave header */
  const HEAD = 96;
  drawWave(doc, HEAD);
  let titleX = M;
  if (id.logo) {
    try {
      doc.save().roundedRect(M, 16, 48, 48, 10).fill("#ffffff").restore();
      doc.image(id.logo, M + 5, 21, { fit: [38, 38], align: "center", valign: "center" });
      titleX = M + 62;
    } catch { titleX = M; }
  }
  putFit(doc, clean(id.name, "Gym"), titleX, 20, 380, { font: "Helvetica-Bold", size: 22, minSize: 13, color: C.white });
  put(doc, "BODY PROGRESS COMPARISON", titleX, 50, { font: "Helvetica", size: 9.5, color: "#c7d8f7", spacing: 1.4 });
  put(doc, "REPORT DATE", LW - M - 150, 20, { font: "Helvetica", size: 7, color: "#c7d8f7", spacing: 1, width: 150, align: "right" });
  put(doc, U.fmtDate(d.today), LW - M - 150, 32, { font: "Helvetica-Bold", size: 12, color: C.white, width: 150, align: "right" });
  y = HEAD + 10;

  /* member strip + summary */
  const stripH = 54;
  doc.save().roundedRect(M, y, LCW, stripH, 9).lineWidth(0.8).fillAndStroke(C.soft, C.line).restore();
  const m = cmp.member;
  putFit(doc, clean(m.name, "Member"), M + 14, y + 10, 230, { font: "Helvetica-Bold", size: 15, minSize: 10, color: C.ink });
  putFit(doc, [m.member_code, m.sex === "male" ? "Male" : m.sex === "female" ? "Female" : "", m.age !== null && m.age !== undefined ? `${m.age} yrs` : ""].filter(Boolean).map((t) => clean(t)).join("   |   "), M + 14, y + 32, 230, { size: 8.5, color: C.muted });
  const first = cmp.columns[0].date;
  const last = cmp.columns[n - 1].date;
  const stats = [
    { label: "Records", value: String(n), color: C.navy },
    { label: "Period", value: `${U.fmtDate(first)} - ${U.fmtDate(last)}`, color: C.navy, wide: true },
    { label: "Improved", value: String(cmp.summary.better), color: C.green },
    { label: "Declined", value: String(cmp.summary.worse), color: C.red },
    { label: "No change", value: String(cmp.summary.same), color: C.muted }
  ];
  let sx = M + 226;
  stats.forEach((st) => {
    const w = st.wide ? 176 : 80;
    doc.rect(sx, y + 10, 2.5, stripH - 20).fill(st.color);
    putFit(doc, st.value, sx + 10, y + 11, w - 14, { font: "Helvetica-Bold", size: st.wide ? 11 : 17, minSize: 8, color: st.color });
    put(doc, st.label.toUpperCase(), sx + 10, y + 34, { font: "Helvetica-Bold", size: 6.5, color: C.muted, spacing: 0.7 });
    sx += w + 8;
  });
  y += stripH + 12;

  /* health issues (active only, to keep the comparison page focused) */
  const active = (cmp.issues || []).filter((i) => !i.resolved);
  if (active.length) {
    const lay = issueLayout(doc, active, LCW);
    ensure(lay.boxH + 6);
    y = drawIssuesAt(doc, y, lay) + 12;
  }

  /* table */
  const female = m.sex === "female";
  GROUP_ORDER.forEach(([gk, title]) => {
    const rows = cmp.rows.filter((r) => r.group === gk);
    if (!rows.length) return;
    const drawTitle = (suffix) => {
      doc.rect(M, y, 3, 14).fill(C.navy);
      put(doc, `${title}${suffix}`, M + 11, y + 2, { font: "Helvetica-Bold", size: 10, color: C.navy });
      y += 20;
    };
    ensure(20 + C_HEAD + C_ROW);
    drawTitle("");
    tableHead();
    rows.forEach((r, i) => {
      if (y + C_ROW > LLIMIT) { newPage(); drawTitle(" (continued)"); tableHead(); }
      if (i % 2 === 1) doc.rect(M, y, LCW, C_ROW).fill(C.soft);
      putFit(doc, clean(female && r.label_f ? r.label_f : r.label, "Reading"), M + 10, y + 8, labelW - 16, { font: "Helvetica-Bold", size: 8.5, minSize: 6.5, color: C.ink });
      r.values.forEach((v, ci) => {
        if (v === null) { put(doc, "-", xCol(ci), y + 8, { size: 9, color: C.grid, width: colW, align: "center" }); return; }
        const isEnd = ci === n - 1;
        putFit(doc, fmtV(r, v, unit), xCol(ci) + 2, y + 8, colW - 4, { font: isEnd ? "Helvetica-Bold" : "Helvetica", size: 8.5, minSize: 6, color: isEnd ? C.ink : C.text, align: "center" });
      });
      const cx = xChange + 8;
      const col = stateColor(r.state);
      if (r.state === "single") put(doc, "Only 1 reading", cx, y + 8, { size: 8, color: C.muted });
      else if (r.state === "same") put(doc, "No change", cx, y + 8, { size: 8, color: C.muted });
      else {
        drawArrow(doc, r.delta > 0, cx, y + 6, col);
        const abs = Math.abs(r.delta);
        putFit(doc, `${r.delta > 0 ? "+" : "-"}${fmtV(r, abs, unit)}`, cx + 13, y + 4, changeW - 24, { font: "Helvetica-Bold", size: 8.5, minSize: 6, color: col });
        const tag = r.state === "better" ? "Improved" : r.state === "worse" ? "Declined" : "Changed";
        putFit(doc, `${tag}${r.pct !== null ? `  ${r.pct >= 100 ? Math.round(r.pct) : r.pct.toFixed(1)}%` : ""}`, cx + 13, y + 15, changeW - 24, { size: 7, minSize: 5.5, color: col });
      }
      hline(doc, M, M + LCW, y + C_ROW, C.line, 0.5);
      y += C_ROW;
    });
    y += 14;
  });

  /* trainer notes of the compared days */
  const notes = cmp.columns.filter((c) => c.note).map((c) => ({ date: c.date, text: clean(c.note) })).filter((x) => x.text);
  if (notes.length) {
    const innerW = LCW - 28;
    const hs = notes.map((x) => paraH(doc, `${U.fmtDate(x.date)}  -  ${x.text}`, innerW, "Helvetica", 9, 2) + 6);
    const boxH = 34 + hs.reduce((a, b) => a + b, 0);
    ensure(boxH + 6);
    doc.save().roundedRect(M, y, LCW, boxH, 9).lineWidth(0.8).fillAndStroke(C.soft, C.line).restore();
    put(doc, "TRAINER NOTES", M + 14, y + 12, { font: "Helvetica-Bold", size: 8, color: C.navy, spacing: 0.9 });
    let ny = y + 28;
    notes.forEach((x, i) => { para(doc, `${U.fmtDate(x.date)}  -  ${x.text}`, M + 14, ny, innerW, { size: 9, color: C.text, lineGap: 2 }); ny += hs[i]; });
    y += boxH + 14;
  }

  /* how to read */
  ensure(62);
  put(doc, "HOW TO READ THIS COMPARISON", M, y, { font: "Helvetica-Bold", size: 7.5, color: C.muted, spacing: 0.9 });
  y += 12;
  para(doc, "Each column is one saved record, oldest on the left. Change compares the last column with the first one that has a reading. A dash means that reading was not taken on that day. Green is a change in the healthy direction, red the opposite; size measurements are shown without colour because gaining muscle or losing fat can both be a goal. This report is not medical advice.", M, y, LCW - 200, { size: 8, color: C.muted, lineGap: 2 });
  const gx = LW - M - 170;
  const ly = y + 30;
  hline(doc, gx, gx + 170, ly, C.grid, 0.8);
  if (id.owner) putFit(doc, clean(id.owner), gx, ly + 4, 170, { font: "Helvetica-Bold", size: 9, minSize: 7, color: C.ink, align: "center" });
  put(doc, "Trainer / Authorised signatory", gx, ly + (id.owner ? 16 : 5), { size: 8, color: C.muted, width: 170, align: "center" });

  /* footer on every page */
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0;
    const fy = LH - 34;
    hline(doc, M, LW - M, fy, C.line, 0.5);
    putFit(doc, [clean(id.name), clean(id.phone), clean(id.email)].filter(Boolean).join("   |   "), M, fy + 9, LCW - 90, { size: 7.5, minSize: 5, color: C.muted });
    put(doc, `Page ${i + 1} of ${range.count}`, LW - M - 70, fy + 9, { font: "Helvetica-Bold", size: 7.5, color: C.muted, width: 70, align: "right" });
  }
}

async function compareReportPdf(venue, memberId, idsRaw, unit, res) {
  const [cmp, id] = await Promise.all([svc.compareView(venue.id, memberId, idsRaw), gymIdentity(venue)]);
  const doc = new PDFDocument({
    size: "A4", layout: "landscape", margin: 0, bufferPages: true,
    info: { Title: `Body Progress Comparison - ${clean(cmp.member.name, "Member")}`, Author: clean(id.name, "Gym"), Subject: "Body measurement comparison" }
  });
  const buf = await toBuffer(doc, () => drawCompare(doc, { id, cmp, unit, today: U.todayIST() }));
  const safe = clean(cmp.member.name).replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "member";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="body-compare-${safe}.pdf"`);
  res.setHeader("Content-Length", buf.length);
  res.setHeader("Cache-Control", "private, no-store");
  res.end(buf);
}

/* ------------------------------ entry point ------------------------------ */

async function bodyReportPdf(venue, memberId, unit, res) {
  const [view, id] = await Promise.all([svc.memberView(venue.id, memberId), gymIdentity(venue)]);
  if (!view.series.length) throw new AppError("No measurements recorded yet for this member", 400);

  const member = view.member;
  const photo = member.photo_url ? await loadLogo(member.photo_url) : null;
  const snap = view.snapshot;
  const dv = snap.derived;
  const w = view.series.find((s) => s.key === "weight");
  const insight = (k) => snap.insights.find((i) => i.key === k);
  const bmi = insight("bmi");
  const bf = insight("body_fat");
  const whr = insight("whr");

  const tiles = [
    { value: w ? `${fmtNum(w.latest.value, 1)} kg` : "-", label: "Weight", sub: w && w.points.length > 1 ? `${w.delta > 0 ? "+" : ""}${fmtNum(w.delta, 1)} kg since first` : "Latest weight" },
    { value: dv.bmi !== undefined ? String(dv.bmi) : "-", label: "BMI", sub: bmi ? bmi.note.split(" (")[0] : "Needs weight and height", tone: bmi ? bmi.tone : null },
    { value: dv.body_fat !== undefined ? `${dv.body_fat}%` : "-", label: dv.body_fat_source === "estimated" ? "Body fat (est.)" : "Body fat", sub: bf ? bf.note : "Needs waist and neck", tone: bf ? bf.tone : null },
    { value: dv.whr !== undefined ? String(dv.whr) : "-", label: "Waist : hip", sub: whr ? whr.note : "Needs waist and hips", tone: whr ? whr.tone : null }
  ];

  const dates = view.series.flatMap((s) => [s.first.date, s.latest.date]).sort();
  const hSeries = view.series.find((s) => s.key === "height");
  const heightTxt = hSeries ? fmtV({ kind: "length" }, hSeries.latest.value, unit) : "-";
  const data = {
    id, view, photo, unit, tiles, today: U.todayIST(),
    issues: view.issues || [],
    name: member.name,
    genderLabel: member.sex === "male" ? "Male" : member.sex === "female" ? "Female" : "",
    details: [
      { label: "Member ID", value: member.member_code || "-" },
      { label: "Age", value: member.age !== null ? `${member.age} yrs` : "-" },
      { label: "Height", value: heightTxt },
      { label: "Records", value: String(view.records.length) },
      { label: "Report period", value: dates[0] === dates[dates.length - 1] ? U.fmtDate(dates[0]) : `${U.fmtDate(dates[0])} - ${U.fmtDate(dates[dates.length - 1])}` },
      { label: "Measured by", value: (view.records[0] && view.records[0].recorded_by) || "-" }
    ],
    rows: buildRows(view, unit),
    notes: view.records.filter((r) => r.note).slice(0, 4).map((r) => ({ date: r.date, text: clean(r.note) })).filter((n) => n.text)
  };

  const doc = new PDFDocument({
    size: "A4", margin: 0, bufferPages: true,
    info: { Title: `Body Measurement Report - ${clean(member.name, "Member")}`, Author: clean(id.name, "Gym"), Subject: "Body measurement report" }
  });
  const buf = await toBuffer(doc, () => drawReport(doc, data));
  const safe = clean(member.name).replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "member";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="body-report-${safe}.pdf"`);
  res.setHeader("Content-Length", buf.length);
  res.setHeader("Cache-Control", "private, no-store");
  res.end(buf);
}

module.exports = { bodyReportPdf, compareReportPdf };