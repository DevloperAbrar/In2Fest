const sharp = require("sharp");
const QRCode = require("qrcode");
const axios = require("axios");
const { GymMember } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const { gymIdentity } = require("./gym.brand");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const W = 1012; // CR80 card ratio (85.6 x 54 mm) at ~300 dpi
const H = 638;
const FONT = "DejaVu Sans, Arial, Helvetica, sans-serif";
const ACCENT = "#dc2626";
const FY = 476; // top of the footer band (gym contact details)

// Only photos uploaded to our own storage are fetched (never an arbitrary URL).
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

/* ---------- text fitting: nothing may run off the card ---------- */
const estW = (text, size, bold) => String(text).length * size * (bold ? 0.64 : 0.58);

// Shrinks the font until the text fits maxW. Only when it still does not fit at minSize is it cut.
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

// Splits an address into at most maxLines lines of about maxChars characters.
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

/* ---------- background (shapes only, so a faint logo can sit between it and the text) ---------- */
function bgSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="0.6" stop-color="#111c33"/><stop offset="1" stop-color="#1e293b"/></linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${ACCENT}"/><stop offset="1" stop-color="#f97316"/></linearGradient>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="36"/></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <polygon points="${W - 360},0 ${W},0 ${W},360" fill="${ACCENT}" opacity="0.12"/>
    <polygon points="${W - 220},0 ${W},0 ${W},220" fill="${ACCENT}" opacity="0.14"/>
    <circle cx="${W - 110}" cy="${H - 190}" r="190" fill="#ffffff" opacity="0.025"/>
    <rect x="0" y="0" width="${W}" height="8" fill="url(#bar)"/>
    <rect x="0" y="${FY}" width="${W}" height="${H - FY}" fill="#020617" opacity="0.6"/>
    <rect x="0" y="${FY}" width="${W}" height="4" fill="url(#bar)"/>
  </g>
</svg>`;
}

/* ---------- all text (transparent background) ---------- */
function textSvg({ id, member, hasPhoto, hasLogo }) {
  const t = (x, y, str, size, { bold = false, fill = "#ffffff", ls = 0, anchor = "start" } = {}) =>
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"${bold ? ' font-weight="700"' : ""}${ls ? ` letter-spacing="${ls}"` : ""}${anchor !== "start" ? ` text-anchor="${anchor}"` : ""} fill="${fill}">${U.esc(str)}</text>`;
  const label = (x, y, str, size = 17) => t(x, y, str, size, { fill: "#94a3b8", ls: 3 });

  const nameX = hasLogo ? 56 + 96 + 22 : 56;
  const gym = fit(id.name, 766 - 24 - nameX, 42, 24);
  const person = fit(member.name, W - 56 - 320 - 30, 54, 24);
  const plan = fit(member.plan_name || "No active plan", 430, 28, 16);
  const validity = member.end_date && member.start_date
    ? `${U.fmtDate(member.start_date)}  -  ${U.fmtDate(member.end_date)}`
    : "Not activated yet";
  const valid = fit(validity, 430, 26, 16);
  const code = fit(member.member_code, 430, 32, 18);

  let status = { text: "NOT ACTIVE", color: "#94a3b8" };
  if (member.end_date) status = member.end_date >= U.todayIST() ? { text: "ACTIVE", color: "#22c55e" } : { text: "EXPIRED", color: "#ef4444" };

  const cx = 56 + 108;
  const cy = 158 + 108;
  const initial = String(member.name || "?").trim().charAt(0).toUpperCase();

  // footer: two columns x two rows, every value is fitted to its own column width
  const L = 56;
  const R = 520;
  const colW = 430;
  const owner = id.owner ? fit(id.owner, colW, 24, 16) : null;
  const phone = id.phone ? fit(id.phone, colW, 24, 16) : null;
  const email = id.email ? fit(id.email, colW, 24, 13) : null;
  const addrLines = id.address ? wrapWords(id.address, Math.floor(colW / (17 * 0.56)), 2) : [];

  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  out += t(nameX, 84, gym.text, gym.size, { bold: true });
  out += t(nameX, 122, "MEMBERSHIP CARD", 18, { fill: ACCENT, ls: 7 });

  out += `<rect x="${W - 56 - 190}" y="50" width="190" height="46" rx="23" fill="${status.color}" opacity="0.18"/>`;
  out += `<circle cx="${W - 56 - 190 + 28}" cy="73" r="7" fill="${status.color}"/>`;
  out += t(W - 56 - 190 + 46, 81, status.text, 22, { bold: true, fill: status.color, ls: 2 });

  out += `<circle cx="${cx}" cy="${cy}" r="116" fill="none" stroke="${ACCENT}" stroke-width="5"/>`;
  if (!hasPhoto) {
    out += `<circle cx="${cx}" cy="${cy}" r="108" fill="#334155"/>`;
    out += t(cx, cy + 30, initial, 96, { bold: true, anchor: "middle" });
  }

  out += t(320, 214, person.text, person.size, { bold: true });
  out += label(320, 272, "MEMBER ID") + t(320, 308, code.text, code.size, { bold: true });
  out += label(320, 350, "PLAN") + t(320, 384, plan.text, plan.size, { bold: true });
  out += label(320, 420, "VALID") + t(320, 452, valid.text, valid.size, { bold: true });
  out += t(W - 56 - 85, 458, "SCAN AT ENTRY", 14, { fill: "#94a3b8", ls: 3, anchor: "middle" });

  if (owner) out += label(L, FY + 34, "OWNER", 14) + t(L, FY + 60, owner.text, owner.size, { bold: true, fill: "#e2e8f0" });
  if (phone) out += label(R, FY + 34, "PHONE", 14) + t(R, FY + 60, phone.text, phone.size, { bold: true, fill: "#e2e8f0" });
  if (email) out += label(L, FY + 94, "EMAIL", 14) + t(L, FY + 120, email.text, email.size, { bold: true, fill: "#e2e8f0" });
  if (addrLines.length) {
    out += label(R, FY + 94, "ADDRESS", 14);
    addrLines.forEach((ln, i) => { out += t(R, FY + 120 + i * 22, ln, 17, { fill: "#cbd5e1" }); });
  }
  return `${out}</svg>`;
}

// Logo on a white rounded tile (works for dark and transparent logos on the dark card).
async function logoTile(buf, size) {
  const pad = 12;
  const inner = size - pad * 2;
  const mark = await sharp(buf).resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  const base = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" rx="22" fill="#ffffff"/></svg>`);
  return sharp(base).composite([{ input: mark, left: pad, top: pad }]).png().toBuffer();
}

// Very faint big copy of the logo behind the text.
async function logoWatermark(buf, size) {
  return sharp(buf)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .linear([1, 1, 1, 0.07], [0, 0, 0, 0])
    .png()
    .toBuffer();
}

async function renderCard({ venue, member, photo, identity }) {
  const id = identity || {
    name: venue.hall_name, owner: venue.owner_name || "", phone: venue.phone || "", email: "",
    address: [venue.address, venue.city].filter(Boolean).join(", "), logo: null
  };
  let round = null;
  if (photo) {
    try { round = await roundPhoto(photo, 216); } catch { round = null; }
  }
  let tile = null;
  let mark = null;
  if (id.logo) {
    try {
      tile = await logoTile(id.logo, 96);
      mark = await logoWatermark(id.logo, 340);
    } catch { tile = null; mark = null; }
  }

  const layers = [];
  if (mark) layers.push({ input: mark, left: W - 340 - 50, top: 110 });
  layers.push({ input: Buffer.from(textSvg({ id, member, hasPhoto: !!round, hasLogo: !!tile })), left: 0, top: 0 });
  if (round) layers.push({ input: round, left: 56, top: 158 });
  if (tile) layers.push({ input: tile, left: 56, top: 38 });

  // QR sits on a white tile so it scans on any background.
  const qr = await QRCode.toBuffer(String(member.member_code), { width: 150, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } });
  const qrTile = await sharp({ create: { width: 170, height: 170, channels: 4, background: "#ffffff" } })
    .composite([{ input: qr, left: 10, top: 10 }]).png().toBuffer();
  layers.push({ input: qrTile, left: W - 56 - 170, top: 258 });

  return sharp(Buffer.from(bgSvg())).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

// Streams a downloadable PNG membership card (gym name + member details).
async function memberCardPng({ venue }, memberId, res) {
  const member = UUID_RE.test(String(memberId))
    ? await GymMember.findOne({ where: { id: memberId, venue_id: venue.id, is_archived: false } })
    : null;
  if (!member) throw new AppError("Member not found", 404);

  const photo = await loadPhoto(member.photo_url);
  const identity = await gymIdentity(venue);
  const png = await renderCard({ venue, member, photo, identity });
  const file = `${String(member.member_code).replace(/[^\w-]+/g, "_")}-membership-card.png`;
  res.set({
    "Content-Type": "image/png",
    "Content-Disposition": `attachment; filename="${file}"`,
    "Cache-Control": "no-store"
  });
  res.send(png);
}

module.exports = { memberCardPng, renderCard };