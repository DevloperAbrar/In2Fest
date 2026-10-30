const sharp = require("sharp");
const axios = require("axios");
const { GymMember } = require("../../database/models");
const { sequelize } = require("../../config/database");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const { gymIdentity } = require("./gym.brand");
const { normalize, getConfig } = require("./gym.card.settings");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const W = 1012;
const H = 638;
const FONT = "DejaVu Sans, Arial, Helvetica, sans-serif";
const FY = 476;

const THEMES = {
  classic: { bg: ["#0b1220", "#111c33", "#1e293b"], accent: "#dc2626", accent2: "#f97316", ink: "#ffffff", label: "#94a3b8", foot: "#e2e8f0", footSub: "#cbd5e1", band: "#020617", bandOp: 0.6, shapeOp: [0.12, 0.14], glow: "#ffffff", glowOp: 0.025, avatar: "#334155", avatarInk: "#ffffff", tileStroke: null, ok: "#22c55e", bad: "#ef4444", off: "#94a3b8" },
  light: { bg: ["#ffffff", "#f8fafc", "#e2e8f0"], accent: "#dc2626", accent2: "#f97316", ink: "#0f172a", label: "#64748b", foot: "#1e293b", footSub: "#334155", band: "#cbd5e1", bandOp: 0.55, shapeOp: [0.1, 0.12], glow: "#0f172a", glowOp: 0.03, avatar: "#cbd5e1", avatarInk: "#0f172a", tileStroke: "#e2e8f0", ok: "#16a34a", bad: "#dc2626", off: "#64748b" },
  gold: { bg: ["#0a0a0a", "#171512", "#26211a"], accent: "#d4af37", accent2: "#f5d77a", ink: "#fafaf9", label: "#a8a29e", foot: "#f5f5f4", footSub: "#d6d3d1", band: "#000000", bandOp: 0.55, shapeOp: [0.1, 0.13], glow: "#d4af37", glowOp: 0.04, avatar: "#3f3a2e", avatarInk: "#f5d77a", tileStroke: null, ok: "#4ade80", bad: "#f87171", off: "#a8a29e" },
  ocean: { bg: ["#082f49", "#0c4a6e", "#0e7490"], accent: "#22d3ee", accent2: "#38bdf8", ink: "#ffffff", label: "#bae6fd", foot: "#f0f9ff", footSub: "#e0f2fe", band: "#021b2b", bandOp: 0.55, shapeOp: [0.12, 0.16], glow: "#ffffff", glowOp: 0.04, avatar: "#155e75", avatarInk: "#ffffff", tileStroke: null, ok: "#4ade80", bad: "#fca5a5", off: "#bae6fd" }
};

function themeFor(cfg) {
  const t = { ...(THEMES[cfg.theme] || THEMES.classic) };
  if (cfg.accent) { t.accent = cfg.accent; t.accent2 = cfg.accent; }
  return t;
}

async function loadPhoto(url) {
  const base = String(process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (!url || !base || !String(url).startsWith(`${base}/`)) return null;
  try {
    const r = await axios.get(url, { responseType: "arraybuffer", timeout: 5000, maxContentLength: 5 * 1024 * 1024, maxRedirects: 0 });
    return Buffer.from(r.data);
  } catch {
    return null;
  }
}

async function roundPhoto(buf, d) {
  const mask = Buffer.from(`<svg width="${d}" height="${d}" xmlns="http://www.w3.org/2000/svg"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="#fff"/></svg>`);
  return sharp(buf).rotate().resize(d, d, { fit: "cover" }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

const t12 = (t) => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(t || ""));
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}${m[2] === "00" ? "" : `:${m[2]}`} ${h < 12 ? "AM" : "PM"}`;
};

// Optional shift line for the card. Returns null when the member has no shift or shifts are not
// set up for this gym, so the card is never affected for gyms that do not use shifts.
async function shiftLabelFor(venueId, memberId) {
  try {
    const [rows] = await sequelize.query(
      `SELECT s.name, s.start_time, s.end_time
         FROM gym_member_shifts ms JOIN gym_shifts s ON s.id = ms.shift_id
        WHERE ms.venue_id = :v AND ms.member_id = :m LIMIT 1`,
      { replacements: { v: venueId, m: memberId } }
    );
    if (!rows.length) return null;
    return `${rows[0].name} · ${t12(rows[0].start_time)} - ${t12(rows[0].end_time)}`;
  } catch {
    return null;
  }
}

const estW = (text, size, bold) => String(text).length * size * (bold ? 0.64 : 0.58);

function fit(text, maxW, base, min, bold = true) {
  const str = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
  let size = base;
  while (size > min && estW(str, size, bold) > maxW) size -= 1;
  let out = str;
  if (estW(out, size, bold) > maxW) {
    const n = Math.max(1, Math.floor(maxW / (size * (bold ? 0.64 : 0.58))) - 1);
    out = `${out.slice(0, n).trim()}…`;
  }
  return { text: out, size };
}

function wrapWords(text, maxChars, maxLines) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let cur = "";
  let i = 0;
  for (; i < words.length; i += 1) {
    const next = cur ? `${cur} ${words[i]}` : words[i];
    if (next.length <= maxChars || !cur) {
      cur = next;
    } else {
      if (lines.length === maxLines - 1) break;
      lines.push(cur);
      cur = words[i];
    }
  }
  if (cur) {
    const rest = words.slice(i).join(" ");
    let last = rest ? `${cur} ${rest}` : cur;
    if (last.length > maxChars) last = `${last.slice(0, maxChars - 1).trim()}…`;
    lines.push(last);
  }
  return lines.slice(0, maxLines);
}

function bgSvg(T, footerOn) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.bg[0]}"/><stop offset="0.6" stop-color="${T.bg[1]}"/><stop offset="1" stop-color="${T.bg[2]}"/></linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${T.accent}"/><stop offset="1" stop-color="${T.accent2}"/></linearGradient>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="36"/></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <polygon points="${W - 360},0 ${W},0 ${W},360" fill="${T.accent}" opacity="${T.shapeOp[0]}"/>
    <polygon points="${W - 220},0 ${W},0 ${W},220" fill="${T.accent}" opacity="${T.shapeOp[1]}"/>
    <circle cx="${W - 110}" cy="${H - 190}" r="190" fill="${T.glow}" opacity="${T.glowOp}"/>
    <rect x="0" y="0" width="${W}" height="8" fill="url(#bar)"/>${footerOn ? `
    <rect x="0" y="${FY}" width="${W}" height="${H - FY}" fill="${T.band}" opacity="${T.bandOp}"/>
    <rect x="0" y="${FY}" width="${W}" height="4" fill="url(#bar)"/>` : ""}
  </g>
</svg>`;
}

const ROW_SLOTS = { 4: [[246, 278], [304, 336], [362, 394], [420, 452]], 3: [[272, 308], [350, 384], [420, 452]], 2: [[286, 322], [386, 420]], 1: [[330, 366]] };

function textSvg({ id, member, hasPhoto, hasLogo, cfg, T, shiftLabel }) {
  const S = cfg.show;
  const t = (x, y, str, size, { bold = false, fill = T.ink, ls = 0, anchor = "start" } = {}) =>
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"${bold ? ' font-weight="700"' : ""}${ls ? ` letter-spacing="${ls}"` : ""}${anchor !== "start" ? ` text-anchor="${anchor}"` : ""} fill="${fill}">${U.esc(str)}</text>`;
  const label = (x, y, str, size = 17) => t(x, y, str, size, { fill: T.label, ls: 3 });

  const nameX = hasLogo ? 56 + 96 + 22 : 56;
  const x0 = S.photo ? 320 : 56;
  const vw = S.photo ? 430 : hasLogo ? 700 : 880;

  const validity = member.end_date && member.start_date ? `${U.fmtDate(member.start_date)}  -  ${U.fmtDate(member.end_date)}` : "Not activated yet";
  const person = fit(member.name, W - 56 - x0 - 30, 54, 24);

  let status = { text: "NOT ACTIVE", color: T.off };
  if (member.end_date) status = member.end_date >= U.todayIST() ? { text: "ACTIVE", color: T.ok } : { text: "EXPIRED", color: T.bad };

  const cx = 56 + 108;
  const cy = 158 + 108;
  const initial = String(member.name || "?").trim().charAt(0).toUpperCase();

  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;

  if (S.gym_name) {
    const gym = fit(id.name, 766 - 24 - nameX, 42, 24);
    out += t(nameX, 84, gym.text, gym.size, { bold: true });
  }
  out += t(nameX, S.gym_name ? 122 : 98, cfg.title, 18, { fill: T.accent, ls: 7 });

  if (S.status) {
    out += `<rect x="${W - 56 - 190}" y="50" width="190" height="46" rx="23" fill="${status.color}" opacity="0.18"/>`;
    out += `<circle cx="${W - 56 - 190 + 28}" cy="73" r="7" fill="${status.color}"/>`;
    out += t(W - 56 - 190 + 46, 81, status.text, 22, { bold: true, fill: status.color, ls: 2 });
  }

  if (S.photo) {
    out += `<circle cx="${cx}" cy="${cy}" r="116" fill="none" stroke="${T.accent}" stroke-width="5"/>`;
    if (!hasPhoto) {
      out += `<circle cx="${cx}" cy="${cy}" r="108" fill="${T.avatar}"/>`;
      out += t(cx, cy + 30, initial, 96, { bold: true, anchor: "middle", fill: T.avatarInk });
    }
  }
  out += t(x0, 214, person.text, person.size, { bold: true });

  const rows = [];
  if (S.member_id) rows.push(["MEMBER ID", fit(member.member_code, vw, 32, 18)]);
  if (S.plan) rows.push(["PLAN", fit(member.plan_name || "No active plan", vw, 28, 16)]);
  if (S.valid) rows.push(["VALID", fit(validity, vw, 26, 16)]);
  if (S.shift && shiftLabel) rows.push(["SHIFT", fit(shiftLabel, vw, 26, 14)]);
  (ROW_SLOTS[rows.length] || []).forEach(([ly, vy], i) => {
    out += label(x0, ly, rows[i][0]) + t(x0, vy, rows[i][1].text, rows[i][1].size, { bold: true });
  });

  const L = 56;
  const R = 520;
  const colW = 430;
  const chips = S.achievements ? cfg.achievements : [];
  const compact = chips.length > 0;
  const cells = [];
  if (S.owner && id.owner) cells.push({ k: "OWNER", v: fit(id.owner, colW, 24, 16) });
  if (S.phone && id.phone) cells.push({ k: "PHONE", v: fit(id.phone, colW, 24, 16) });
  if (S.email && id.email) cells.push({ k: "EMAIL", v: fit(id.email, colW, 24, 13) });
  if (S.address && id.address) {
    cells.push(compact ? { k: "ADDRESS", v: fit(id.address, colW, 20, 12, false), plain: true } : { k: "ADDRESS", lines: wrapWords(id.address, Math.floor(colW / (17 * 0.56)), 2) });
  }
  const rowsUsed = Math.ceil(cells.length / 2);
  const tops = compact ? [[FY + 26, FY + 50], [FY + 72, FY + 96]] : [[FY + 34, FY + 60], [FY + 94, FY + 120]];
  cells.forEach((c, i) => {
    const x = i % 2 === 0 ? L : R;
    const [ly, vy] = tops[Math.floor(i / 2)];
    out += label(x, ly, c.k, 14);
    if (c.lines) c.lines.forEach((ln, j) => { out += t(x, vy + j * 22, ln, 17, { fill: T.footSub }); });
    else out += t(x, vy, c.v.text, c.v.size, { bold: !c.plain, fill: c.plain ? T.footSub : T.foot });
  });

  if (compact) {
    const cy0 = rowsUsed === 0 ? FY + 44 : rowsUsed === 1 ? FY + 78 : FY + 114;
    const avail = W - 56 - L;
    const texts = chips.map((a) => `★ ${a}`);
    let size = 17;
    const widths = () => texts.map((s) => estW(s, size, true) + 36);
    while (size > 12 && widths().reduce((a, b) => a + b, 0) + (texts.length - 1) * 12 > avail) size -= 1;
    let x = L;
    texts.forEach((s, i) => {
      const w = widths()[i];
      if (x + w > L + avail) return;
      out += `<rect x="${x}" y="${cy0}" width="${w}" height="34" rx="17" fill="${T.accent}" fill-opacity="0.18" stroke="${T.accent}" stroke-opacity="0.55" stroke-width="1.5"/>`;
      out += t(x + 18, cy0 + 23, s, size, { bold: true, fill: T.foot });
      x += w + 12;
    });
  }
  return { svg: `${out}</svg>`, footerOn: cells.length > 0 || compact };
}

async function logoTile(buf, size, stroke) {
  const pad = 12;
  const inner = size - pad * 2;
  const mark = await sharp(buf).resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  const edge = stroke ? ` stroke="${stroke}" stroke-width="2"` : "";
  const base = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="22" fill="#ffffff"${edge}/></svg>`);
  return sharp(base).composite([{ input: mark, left: pad, top: pad }]).png().toBuffer();
}

async function renderCard({ venue, member, photo, identity, config, shiftLabel }) {
  const cfg = normalize(config);
  const T = themeFor(cfg);
  const id = identity || {
    name: venue.hall_name, owner: venue.owner_name || "", phone: venue.phone || "", email: "",
    address: [venue.address, venue.city].filter(Boolean).join(", "), logo: null
  };
  let round = null;
  if (photo && cfg.show.photo) {
    try { round = await roundPhoto(photo, 216); } catch { round = null; }
  }
  let tile = null;
  let bigTile = null;
  if (id.logo && cfg.show.logo) {
    try {
      tile = await logoTile(id.logo, 96, T.tileStroke);
      bigTile = await logoTile(id.logo, 170, T.tileStroke);
    } catch { tile = null; bigTile = null; }
  }

  const text = textSvg({ id, member, hasPhoto: !!round, hasLogo: !!tile, cfg, T, shiftLabel });
  const layers = [{ input: Buffer.from(text.svg), left: 0, top: 0 }];
  if (round) layers.push({ input: round, left: 56, top: 158 });
  if (tile) layers.push({ input: tile, left: 56, top: 38 });
  if (bigTile) layers.push({ input: bigTile, left: W - 56 - 170, top: 258 });

  return sharp(Buffer.from(bgSvg(T, text.footerOn))).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

async function memberCardPng({ venue }, memberId, res) {
  const member = UUID_RE.test(String(memberId))
    ? await GymMember.findOne({ where: { id: memberId, venue_id: venue.id, is_archived: false } })
    : null;
  if (!member) throw new AppError("Member not found", 404);

  const [photo, identity, config] = await Promise.all([loadPhoto(member.photo_url), gymIdentity(venue), getConfig(venue.id)]);
  const shiftLabel = config.show.shift ? await shiftLabelFor(venue.id, member.id) : null;
  const png = await renderCard({ venue, member, photo, identity, config, shiftLabel });
  const file = `${String(member.member_code).replace(/[^\w-]+/g, "_")}-membership-card.png`;
  res.set({
    "Content-Type": "image/png",
    "Content-Disposition": `attachment; filename="${file}"`,
    "Cache-Control": "no-store"
  });
  res.send(png);
}

async function memberCardBuffer(venue, member) {
  const [photo, identity, config] = await Promise.all([loadPhoto(member.photo_url), gymIdentity(venue), getConfig(venue.id)]);
  const shiftLabel = config.show.shift ? await shiftLabelFor(venue.id, member.id) : null;
  return renderCard({ venue, member, photo, identity, config, shiftLabel });
}

// Live preview for the card designer (unsaved design + real or sample member).
async function previewCardPng({ venue }, body, res) {
  const b = body || {};
  let member = UUID_RE.test(String(b.member_id || ""))
    ? await GymMember.findOne({ where: { id: b.member_id, venue_id: venue.id, is_archived: false } })
    : null;
  let photo = null;
  let shiftLabel = null;
  const wantShift = !!(b.config && b.config.show && b.config.show.shift);
  if (member) {
    photo = await loadPhoto(member.photo_url);
    if (wantShift) shiftLabel = await shiftLabelFor(venue.id, member.id);
  } else {
    if (wantShift) shiftLabel = "Morning Batch · 7 AM - 8 AM";
    const today = U.todayIST();
    member = { name: "Rahul Sharma", member_code: "M0001", plan_name: "6 Months Gold", start_date: today, end_date: U.addDays(today, 179) };
  }
  const identity = await gymIdentity(venue);
  const png = await renderCard({ venue, member, photo, identity, config: b.config, shiftLabel });
  res.set({ "Content-Type": "image/png", "Cache-Control": "no-store" });
  res.send(png);
}

module.exports = { memberCardPng, memberCardBuffer, renderCard, previewCardPng };