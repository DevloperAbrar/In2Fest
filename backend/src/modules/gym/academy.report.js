// Sports Academy / Studio: downloadable PDF progress report for ONE student.
//
// Read-only. It reuses exactly the data the Progress screen shows (academy.service) and the same
// branding (logo, name, contact details) as receipts and workout PDFs. Nothing is saved or changed.
// The PDF is built fully in memory first, so a failure returns a normal JSON error instead of a
// half-sent, broken file.
const PDFDocument = require("pdfkit");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const D = require("../../config/academyDisciplines");
const svc = require("./academy.service");
const { gymIdentity, loadLogo, pill } = require("./gym.brand");
const { PAL: C, put, putFit, para, paraH, hline, drawWave, drawTopStrip } = require("../billing/pdf.theme");

// A4 portrait geometry
const PW = 595.28;
const PH = 841.89;
const M = 36;
const CW = PW - M * 2;
const LIMIT = PH - 58; // content never goes below this line (the footer lives under it)

// Results table columns
const COLS = { test: 168, first: 58, latest: 66, best: 58, change: 92 };
COLS.trend = CW - (COLS.test + COLS.first + COLS.latest + COLS.best + COLS.change);
const X = {
  test: M,
  first: M + COLS.test,
  latest: M + COLS.test + COLS.first,
  best: M + COLS.test + COLS.first + COLS.latest,
  change: M + COLS.test + COLS.first + COLS.latest + COLS.best,
  trend: M + COLS.test + COLS.first + COLS.latest + COLS.best + COLS.change
};
const HEAD_H = 24;
const ROW_H = 36;
const MAX_NOTES = 4;
const SPARK_POINTS = 12;

const GOOD = C.green;
const BAD = C.red;
const NEUTRAL = C.muted;

/* ------------------------------ small helpers ------------------------------ */

// The built-in PDF fonts only know Latin characters. Anything else (for example Devanagari) would
// print as garbage, so it is dropped here and a fallback is used when nothing is left.
const clean = (s, fallback = "") => {
  const t = String(s == null ? "" : s)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t || fallback;
};

const fmtNum = (n) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtVal = (v, unit) => {
  const s = fmtNum(v);
  const u = clean(unit);
  return u ? (u.startsWith("/") ? `${s}${u}` : `${s} ${u}`) : s;
};
const round2 = (n) => Math.round(n * 100) / 100;

// How a test moved from the FIRST result to the LATEST one.
function trendOf(item) {
  const s = item.series;
  if (s.length < 2) return { state: "first", d: 0, pct: null };
  const first = s[0].value;
  const d = round2(s[s.length - 1].value - first);
  const pct = first ? Math.abs((d / first) * 100) : null;
  if (d === 0) return { state: "same", d, pct };
  if (item.better === "none") return { state: "neutral", d, pct };
  const good = item.better === "lower" ? d < 0 : d > 0;
  return { state: good ? "better" : "worse", d, pct };
}

const stateColor = (state) => (state === "better" ? GOOD : state === "worse" ? BAD : NEUTRAL);

// Sections: fitness tests first, then each sport / class the student does, then everything else.
function buildGroups(items, profile) {
  const chosen = (profile && profile.disciplines) || [];
  const groups = new Map();
  let extra = 0;
  items.forEach((it) => {
    const dot = String(it.test_key).indexOf(".");
    const prefix = dot > 0 ? String(it.test_key).slice(0, dot) : "";
    const disc = D.get(prefix);
    let key;
    let title;
    let weight;
    if (prefix === "common") {
      key = "common"; title = "Fitness tests"; weight = 0;
    } else if (disc) {
      const skills = it.kind === "rating";
      const at = chosen.indexOf(prefix);
      key = `${prefix}:${skills ? "s" : "t"}`;
      title = skills ? `${clean(disc.label)}: skill ratings (1 to 5)` : `${clean(disc.label)}: tests`;
      weight = (at >= 0 ? 1 + at : 20 + extra) + (skills ? 0.5 : 0);
      if (at < 0) extra += 1;
    } else {
      key = "other"; title = "Other tests"; weight = 99;
    }
    if (!groups.has(key)) groups.set(key, { title, weight, items: [] });
    groups.get(key).items.push(it);
  });
  const out = [...groups.values()].sort((a, b) => a.weight - b.weight);
  out.forEach((g) => g.items.sort((a, b) => String(a.label).localeCompare(String(b.label))));
  return out;
}

/* ------------------------------ drawing pieces ------------------------------ */

function drawSpark(doc, values, x, y, w, h, color) {
  doc.save();
  if (!values || values.length === 0) { doc.restore(); return; }
  const pts = values.slice(-SPARK_POINTS);
  const pad = 3;
  const midY = y + h / 2;
  if (pts.length === 1) {
    doc.circle(x + w / 2, midY, 2.6).fill(color);
    doc.restore();
    return;
  }
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min;
  const px = (i) => x + pad + (i * (w - pad * 2)) / (pts.length - 1);
  const py = (v) => (span === 0 ? midY : y + h - pad - ((v - min) / span) * (h - pad * 2));
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
  const ty = y + 8;
  put(doc, "TEST", X.test + 10, ty, h);
  put(doc, "FIRST", X.first, ty, { ...h, width: COLS.first, align: "center" });
  put(doc, "LATEST", X.latest, ty, { ...h, width: COLS.latest, align: "center" });
  put(doc, "BEST", X.best, ty, { ...h, width: COLS.best, align: "center" });
  put(doc, "CHANGE", X.change + 10, ty, h);
  put(doc, "TREND", X.trend, ty, { ...h, width: COLS.trend, align: "center" });
  return y + HEAD_H;
}

function drawRow(doc, item, y, zebra) {
  if (zebra) doc.rect(M, y, CW, ROW_H).fill(C.soft);
  const tr = trendOf(item);
  const color = stateColor(tr.state);
  const latest = item.series[item.series.length - 1];
  const mid = y + (ROW_H - 10) / 2;

  putFit(doc, clean(item.label, "Test"), X.test + 10, y + 7, COLS.test - 18, { font: "Helvetica-Bold", size: 9.5, minSize: 7, color: C.ink });
  const n = item.series.length;
  putFit(doc, `Last: ${U.fmtDate(latest.date)}  |  ${n} result${n === 1 ? "" : "s"}`, X.test + 10, y + 21, COLS.test - 18, { size: 7.5, minSize: 6, color: C.muted });

  putFit(doc, fmtVal(item.series[0].value, item.unit), X.first + 4, mid, COLS.first - 8, { size: 9, color: C.text, align: "center" });
  putFit(doc, fmtVal(latest.value, item.unit), X.latest + 4, y + (ROW_H - 11) / 2, COLS.latest - 8, { font: "Helvetica-Bold", size: 10.5, minSize: 7, color: C.ink, align: "center" });
  putFit(doc, item.best === null || item.best === undefined ? "-" : fmtVal(item.best, item.unit), X.best + 4, mid, COLS.best - 8, { size: 9, color: C.text, align: "center" });

  // change since the first result
  const cx = X.change + 10;
  if (tr.state === "first") {
    put(doc, "First record", cx, mid, { size: 8.5, color: C.muted });
  } else if (tr.state === "same") {
    put(doc, "No change", cx, mid, { size: 8.5, color: C.muted });
  } else {
    drawArrow(doc, tr.d > 0, cx, y + 9, color);
    putFit(doc, `${tr.d > 0 ? "+" : "-"}${fmtVal(Math.abs(tr.d), item.unit)}`, cx + 13, y + 7, COLS.change - 24, { font: "Helvetica-Bold", size: 9, minSize: 6.5, color });
    const tag = tr.state === "better" ? "Improved" : tr.state === "worse" ? "Declined" : "Changed";
    const pct = tr.pct !== null ? `  ${tr.pct >= 100 ? Math.round(tr.pct) : round2(tr.pct).toFixed(1)}%` : "";
    putFit(doc, `${tag}${pct}`, cx + 13, y + 21, COLS.change - 24, { size: 7.5, minSize: 6, color });
  }

  drawSpark(doc, item.series.map((s) => s.value), X.trend + 8, y + 7, COLS.trend - 16, ROW_H - 14, color);
  hline(doc, M, M + CW, y + ROW_H, C.line, 0.5);
}

function drawStudentCard(doc, y, d) {
  const H = 108;
  doc.save().roundedRect(M, y, CW, H, 10).lineWidth(0.8).fillAndStroke(C.soft, C.line).restore();

  // photo or initials
  const px = M + 14;
  const py = y + 18;
  const S = 72;
  let drewPhoto = false;
  if (d.photo) {
    try {
      doc.save();
      doc.roundedRect(px, py, S, S, 10).clip();
      doc.image(d.photo, px, py, { cover: [S, S], align: "center", valign: "center" });
      drewPhoto = true;
    } catch {
      drewPhoto = false;
    } finally {
      doc.restore();
    }
  }
  if (!drewPhoto) {
    doc.save().roundedRect(px, py, S, S, 10).fill(C.navySoft).restore();
    const initials = clean(d.name).split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "S";
    put(doc, initials, px, py + S / 2 - 14, { font: "Helvetica-Bold", size: 28, color: C.navy, width: S, align: "center" });
  }

  const rx = px + S + 18;
  const rw = CW - (rx - M) - 14;
  putFit(doc, clean(d.name, d.person), rx, y + 14, rw, { font: "Helvetica-Bold", size: 17, minSize: 11, color: C.ink });

  // sport / class pills
  let pxx = rx;
  d.disciplines.slice(0, 4).forEach((t) => {
    const label = clean(t);
    if (!label) return;
    doc.font("Helvetica-Bold").fontSize(8);
    const w = doc.widthOfString(label) + 18;
    if (pxx + w > rx + rw) return;
    pxx += pill(doc, label, pxx, y + 38, { bg: C.navySoft, fg: C.navy, border: C.navySoft, size: 8, h: 18 }) + 6;
  });

  // details grid (3 columns x 2 rows)
  const colW = rw / 3;
  d.details.forEach((cell, i) => {
    const cx = rx + (i % 3) * colW;
    const cy = y + 64 + Math.floor(i / 3) * 22;
    put(doc, cell.label.toUpperCase(), cx, cy, { font: "Helvetica-Bold", size: 6.5, color: C.muted, spacing: 0.8 });
    putFit(doc, clean(cell.value, "-"), cx, cy + 9, colW - 8, { font: "Helvetica-Bold", size: 9, minSize: 6.5, color: C.ink });
  });
  return y + H;
}

function drawTiles(doc, y, tiles) {
  const gap = 10;
  const w = (CW - gap * (tiles.length - 1)) / tiles.length;
  const h = 58;
  tiles.forEach((t, i) => {
    const x = M + i * (w + gap);
    doc.save().roundedRect(x, y, w, h, 9).lineWidth(0.8).fillAndStroke(t.bg || C.white, t.border || C.line).restore();
    putFit(doc, t.value, x + 12, y + 10, w - 24, { font: "Helvetica-Bold", size: t.valueSize || 22, minSize: 10, color: t.color || C.navy });
    put(doc, t.label.toUpperCase(), x + 12, y + 37, { font: "Helvetica-Bold", size: 6.8, color: C.muted, spacing: 0.7 });
    putFit(doc, t.sub || "", x + 12, y + 46, w - 24, { size: 7.5, minSize: 6, color: C.muted });
  });
  return y + h;
}

/* ------------------------------ report ------------------------------ */

function drawReport(doc, d) {
  const { id, items, groups } = d;
  let y = 0;

  const contHeader = () => {
    drawTopStrip(doc);
    put(doc, `Progress Report  |  ${clean(d.name, d.person)}`, M, 22, { font: "Helvetica-Bold", size: 9, color: C.navy });
    put(doc, clean(id.name), M, 22, { size: 8.5, color: C.muted, width: CW, align: "right" });
    hline(doc, M, M + CW, 38, C.line, 0.6);
    return 52;
  };
  const newPage = () => {
    doc.addPage({ size: "A4", margin: 0 });
    y = contHeader();
  };
  const ensure = (h) => {
    if (y + h > LIMIT) { newPage(); return true; }
    return false;
  };

  /* ---------- wave header ---------- */
  const HEAD = 106;
  drawWave(doc, HEAD);
  let titleX = M;
  if (id.logo) {
    try {
      doc.save().roundedRect(M, 18, 52, 52, 10).fill("#ffffff").restore();
      doc.image(id.logo, M + 5, 23, { fit: [42, 42], align: "center", valign: "center" });
      titleX = M + 52 + 14;
    } catch {
      titleX = M;
    }
  }
  putFit(doc, clean(id.name, "Academy"), titleX, 22, 300, { font: "Helvetica-Bold", size: 24, minSize: 13, color: C.white });
  put(doc, "STUDENT PROGRESS REPORT", titleX, 54, { font: "Helvetica", size: 9.5, color: "#c7d8f7", spacing: 1.4 });
  put(doc, "REPORT DATE", PW - M - 150, 22, { font: "Helvetica", size: 7, color: "#c7d8f7", spacing: 1, width: 150, align: "right" });
  put(doc, U.fmtDate(d.today), PW - M - 150, 34, { font: "Helvetica-Bold", size: 12, color: C.white, width: 150, align: "right" });

  y = HEAD + 14;

  /* ---------- student card ---------- */
  y = drawStudentCard(doc, y, d) + 14;

  /* ---------- summary tiles ---------- */
  y = drawTiles(doc, y, [
    { value: String(items.length), label: "Tests tracked", sub: `${d.totalResults} result${d.totalResults === 1 ? "" : "s"} recorded` },
    { value: String(d.improved), label: "Improved", sub: `of ${d.comparable} comparable`, color: GOOD, bg: C.greenSoft, border: C.greenSoft },
    { value: String(d.declined), label: "Needs focus", sub: d.declined ? "Lower than first result" : "Nothing slipping", color: d.declined ? BAD : C.muted, bg: d.declined ? C.redSoft : C.white, border: d.declined ? C.redSoft : C.line },
    { value: U.fmtDate(d.lastDate), valueSize: 14, label: "Last assessed", sub: d.firstDate === d.lastDate ? "Single session" : `Since ${U.fmtDate(d.firstDate)}` }
  ]) + 12;

  /* ---------- highlight ---------- */
  if (d.highlight) {
    doc.save().roundedRect(M, y, CW, 28, 8).fill(C.greenSoft).restore();
    doc.rect(M, y + 6, 3, 16).fill(GOOD);
    put(doc, "Highlight", M + 14, y + 10, { font: "Helvetica-Bold", size: 9, color: GOOD });
    putFit(doc, d.highlight, M + 70, y + 10, CW - 84, { size: 9, minSize: 7, color: C.ink });
    y += 28 + 16;
  } else {
    y += 4;
  }

  /* ---------- result tables ---------- */
  groups.forEach((g) => {
    const drawGroupTitle = (suffix) => {
      doc.rect(M, y, 3, 15).fill(C.navy);
      put(doc, `${g.title}${suffix}`, M + 11, y + 2, { font: "Helvetica-Bold", size: 10.5, color: C.navy });
      put(doc, `${g.items.length} test${g.items.length === 1 ? "" : "s"}`, M, y + 3, { size: 8, color: C.muted, width: CW, align: "right" });
      y += 22;
    };
    ensure(22 + HEAD_H + ROW_H);
    drawGroupTitle("");
    y = drawTableHead(doc, y);
    g.items.forEach((it, i) => {
      if (y + ROW_H > LIMIT) {
        newPage();
        drawGroupTitle(" (continued)");
        y = drawTableHead(doc, y);
      }
      drawRow(doc, it, y, i % 2 === 1);
      y += ROW_H;
    });
    y += 18;
  });

  /* ---------- coach notes ---------- */
  if (d.notes.length) {
    const innerW = CW - 28;
    const heights = d.notes.map((n) => paraH(doc, `${U.fmtDate(n.date)}  -  ${n.text}`, innerW, "Helvetica", 9, 2) + 6);
    const boxH = 34 + heights.reduce((a, b) => a + b, 0);
    ensure(boxH + 6);
    doc.save().roundedRect(M, y, CW, boxH, 9).lineWidth(0.8).fillAndStroke(C.soft, C.line).restore();
    put(doc, "COACH NOTES", M + 14, y + 12, { font: "Helvetica-Bold", size: 8, color: C.navy, spacing: 0.9 });
    let ny = y + 28;
    d.notes.forEach((n, i) => {
      para(doc, `${U.fmtDate(n.date)}  -  ${n.text}`, M + 14, ny, innerW, { size: 9, color: C.text, lineGap: 2 });
      ny += heights[i];
    });
    y += boxH + 18;
  }

  /* ---------- how to read + sign-off ---------- */
  ensure(96);
  put(doc, "HOW TO READ THIS REPORT", M, y, { font: "Helvetica-Bold", size: 7.5, color: C.muted, spacing: 0.9 });
  y += 13;
  y += para(doc, "First is the earliest recorded result and Latest is the most recent one. Change compares Latest with First. For timed tests a lower time is better; for distance, count and rating tests a higher value is better. The trend line shows up to the last 12 results.", M, y, CW - 190, { size: 8, color: C.muted, lineGap: 2 });

  const sx = PW - M - 170;
  const sy = Math.max(y + 18, LIMIT - 40);
  hline(doc, sx, sx + 170, Math.min(sy, LIMIT - 22), C.grid, 0.8);
  const ly = Math.min(sy, LIMIT - 22);
  if (id.owner) putFit(doc, clean(id.owner), sx, ly + 5, 170, { font: "Helvetica-Bold", size: 9, minSize: 7, color: C.ink, align: "center" });
  put(doc, "Coach / Authorised signatory", sx, ly + (id.owner ? 17 : 6), { size: 8, color: C.muted, width: 170, align: "center" });

  /* ---------- footer on every page ---------- */
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0; // footer sits inside the bottom margin; stop pdfkit adding a page
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

/* ------------------------------ entry point ------------------------------ */

async function progressReportPdf(venue, variant, memberId, res) {
  // These two calls already validate the student, the venue and the account type.
  const [profileData, progress, id] = await Promise.all([
    svc.getProfile(venue.id, memberId, variant),
    svc.progress(venue.id, variant, memberId),
    gymIdentity(venue)
  ]);
  const items = (progress && progress.items) || [];
  if (!items.length) throw new AppError("No results recorded yet for this student", 400);

  const member = profileData.member;
  const profile = profileData.profile || {};
  const person = (D.VARIANTS[variant] && D.VARIANTS[variant].person) || "Student";
  const isStudio = variant === "studio";
  const photo = member.photo_url ? await loadLogo(member.photo_url) : null;

  // headline numbers
  let improved = 0;
  let declined = 0;
  let comparable = 0;
  let best = null;
  let totalResults = 0;
  items.forEach((it) => {
    totalResults += it.series.length;
    const t = trendOf(it);
    if (t.state === "better" || t.state === "worse" || t.state === "same") {
      if (it.better !== "none") comparable += 1;
    }
    if (t.state === "better") {
      improved += 1;
      if (t.pct !== null && (!best || t.pct > best.pct)) best = { it, pct: t.pct };
    }
    if (t.state === "worse") declined += 1;
  });
  const dates = items.flatMap((it) => [it.series[0].date, it.series[it.series.length - 1].date]).sort();
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  // coach notes: latest few, each only once
  const seen = new Set();
  const notes = items
    .flatMap((it) => it.series.filter((s) => s.note).map((s) => ({ date: s.date, text: clean(s.note) })))
    .filter((n) => n.text)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .filter((n) => { const k = `${n.date}|${n.text}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, MAX_NOTES);

  const disciplines = (profile.disciplines || []).map((k) => {
    const dd = D.get(k);
    if (!dd) return "";
    const lv = profile.levels && profile.levels[k];
    return lv ? `${dd.label} - ${lv}` : dd.label;
  }).filter(Boolean);

  const batches = (profileData.batches || []).map((b) => b.name).filter(Boolean);
  const details = [
    { label: `${person} ID`, value: member.member_code || "-" },
    { label: "Age", value: member.age !== null && member.age !== undefined ? `${member.age} yrs` : "-" },
    { label: "School / college", value: profile.school || "-" },
    { label: isStudio ? "Class" : "Batch", value: batches.join(", ") || "-" },
    { label: "Parent / guardian", value: member.parent_name || "-" },
    { label: "Report period", value: firstDate === lastDate ? U.fmtDate(lastDate) : `${U.fmtDate(firstDate)} - ${U.fmtDate(lastDate)}` }
  ];

  const data = {
    id, items, groups: buildGroups(items, profile), person, photo,
    name: member.name, disciplines, details, notes,
    improved, declined, comparable, totalResults, firstDate, lastDate,
    today: U.todayIST(),
    highlight: best ? `Biggest improvement: ${clean(best.it.label)}, ${best.pct >= 100 ? Math.round(best.pct) : round2(best.pct).toFixed(1)}% better than the first result.` : ""
  };

  const doc = new PDFDocument({
    size: "A4", margin: 0, bufferPages: true,
    info: { Title: `Progress Report - ${clean(member.name, person)}`, Author: clean(id.name, "Academy"), Subject: "Student progress report" }
  });
  const buf = await toBuffer(doc, () => drawReport(doc, data));

  const safe = clean(member.name).replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "student";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="progress-report-${safe}.pdf"`);
  res.setHeader("Content-Length", buf.length);
  res.setHeader("Cache-Control", "private, no-store");
  res.end(buf);
}

module.exports = { progressReportPdf };