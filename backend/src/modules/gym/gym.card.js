const sharp = require("sharp");
const QRCode = require("qrcode");
const axios = require("axios");
const { GymMember } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const W = 1012; // CR80 card ratio (85.6 x 54 mm) at ~300 dpi
const H = 638;
const FONT = "DejaVu Sans, Arial, Helvetica, sans-serif";
const ACCENT = "#dc2626";

const clip = (s, n) => {
  const t = String(s ?? "").trim().replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

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

function buildSvg({ venue, member, hasPhoto }) {
  const gym = clip(venue.hall_name, 30);
  const gymSize = gym.length <= 18 ? 44 : gym.length <= 24 ? 36 : 30;
  const name = clip(member.name, 26);
  const nameSize = name.length <= 16 ? 54 : name.length <= 22 ? 46 : 38;
  const validity = member.end_date && member.start_date
    ? `${U.fmtDate(member.start_date)}  -  ${U.fmtDate(member.end_date)}`
    : "Not activated yet";
  const footer = [venue.city, venue.phone].filter(Boolean).join("   |   ");
  const cx = 56 + 108;
  const cy = 190 + 108;
  const initial = U.esc(String(member.name || "?").trim().charAt(0).toUpperCase());

  const label = (x, y, t) => `<text x="${x}" y="${y}" font-family="${FONT}" font-size="20" letter-spacing="3" fill="#94a3b8">${t}</text>`;
  const value = (x, y, t, size = 32) => `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="700" fill="#ffffff">${U.esc(t)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#1e293b"/></linearGradient>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="36"/></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="${W - 40}" cy="40" r="230" fill="${ACCENT}" opacity="0.14"/>
    <circle cx="${W - 150}" cy="${H + 40}" r="170" fill="${ACCENT}" opacity="0.10"/>
    <rect x="0" y="0" width="14" height="${H}" fill="${ACCENT}"/>
    <rect x="0" y="${H - 68}" width="${W}" height="68" fill="#000" opacity="0.28"/>
  </g>
  <text x="56" y="92" font-family="${FONT}" font-size="${gymSize}" font-weight="700" fill="#ffffff">${U.esc(gym)}</text>
  <text x="56" y="132" font-family="${FONT}" font-size="20" letter-spacing="6" fill="${ACCENT}">MEMBERSHIP CARD</text>
  <circle cx="${cx}" cy="${cy}" r="116" fill="none" stroke="${ACCENT}" stroke-width="5"/>
  ${hasPhoto ? "" : `<circle cx="${cx}" cy="${cy}" r="108" fill="#334155"/><text x="${cx}" y="${cy + 30}" text-anchor="middle" font-family="${FONT}" font-size="96" font-weight="700" fill="#ffffff">${initial}</text>`}
  <text x="320" y="236" font-family="${FONT}" font-size="${nameSize}" font-weight="700" fill="#ffffff">${U.esc(name)}</text>
  ${label(320, 300, "MEMBER ID")}${value(320, 342, member.member_code, 34)}
  ${label(320, 398, "PLAN")}${value(320, 438, clip(member.plan_name || "No active plan", 26), 30)}
  ${label(320, 494, "VALID")}${value(320, 534, validity, 28)}
  ${footer ? `<text x="56" y="${H - 26}" font-family="${FONT}" font-size="22" fill="#cbd5e1">${U.esc(clip(footer, 60))}</text>` : ""}
</svg>`;
}

async function renderCard({ venue, member, photo }) {
  let round = null;
  if (photo) {
    try { round = await roundPhoto(photo, 216); } catch { round = null; }
  }
  const layers = [];
  if (round) layers.push({ input: round, left: 56, top: 190 });

  const qr = await QRCode.toBuffer(String(member.member_code), { width: 170, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } });
  layers.push({ input: qr, left: W - 56 - 170, top: 380 });

  return sharp(Buffer.from(buildSvg({ venue, member, hasPhoto: !!round })))
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// Streams a downloadable PNG membership card (gym name + member details).
async function memberCardPng({ venue }, memberId, res) {
  const member = UUID_RE.test(String(memberId))
    ? await GymMember.findOne({ where: { id: memberId, venue_id: venue.id, is_archived: false } })
    : null;
  if (!member) throw new AppError("Member not found", 404);

  const photo = await loadPhoto(member.photo_url);
  const png = await renderCard({ venue, member, photo });
  const file = `${String(member.member_code).replace(/[^\w-]+/g, "_")}-membership-card.png`;
  res.set({
    "Content-Type": "image/png",
    "Content-Disposition": `attachment; filename="${file}"`,
    "Cache-Control": "no-store"
  });
  res.send(png);
}

module.exports = { memberCardPng, renderCard };