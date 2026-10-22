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

function buildSvg({ id, member, hasPhoto }) {
  const gym = clip(id.name, 30);
  const gymSize = gym.length <= 18 ? 44 : gym.length <= 24 ? 36 : 30;
  const name = clip(member.name, 26);
  const nameSize = name.length <= 16 ? 54 : name.length <= 22 ? 46 : 38;
  const validity = member.end_date && member.start_date
    ? `${U.fmtDate(member.start_date)}  -  ${U.fmtDate(member.end_date)}`
    : "Not activated yet";

  let status = { text: "NOT ACTIVE", color: "#94a3b8" };
  if (member.end_date) status = member.end_date >= U.todayIST() ? { text: "ACTIVE", color: "#22c55e" } : { text: "EXPIRED", color: "#ef4444" };

  const cx = 56 + 108;
  const cy = 165 + 108;
  const initial = U.esc(String(member.name || "?").trim().charAt(0).toUpperCase());
  const FY = H - 118; // footer band top

  const label = (x, y, t, size = 18) => `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" letter-spacing="3" fill="#94a3b8">${t}</text>`;
  const value = (x, y, t, size = 32) => `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="700" fill="#ffffff">${U.esc(t)}</text>`;
  const small = (x, y, t, size = 22) => `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="700" fill="#e2e8f0">${U.esc(t)}</text>`;

  const owner = id.owner ? clip(id.owner, 16) : "";
  const phone = id.phone ? clip(id.phone, 17) : "";
  const email = id.email ? clip(id.email, 31) : "";
  const address = id.address ? clip(id.address, 82) : "";

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
    <circle cx="${W - 110}" cy="${H - 150}" r="190" fill="#ffffff" opacity="0.025"/>
    <rect x="0" y="0" width="${W}" height="8" fill="url(#bar)"/>
    <rect x="0" y="${FY}" width="${W}" height="${H - FY}" fill="#020617" opacity="0.55"/>
    <rect x="0" y="${FY}" width="${W}" height="4" fill="url(#bar)"/>
  </g>
  <text x="56" y="88" font-family="${FONT}" font-size="${gymSize}" font-weight="700" fill="#ffffff">${U.esc(gym)}</text>
  <text x="56" y="126" font-family="${FONT}" font-size="19" letter-spacing="7" fill="${ACCENT}">MEMBERSHIP CARD</text>

  <rect x="${W - 56 - 190}" y="52" width="190" height="46" rx="23" fill="${status.color}" opacity="0.16"/>
  <circle cx="${W - 56 - 190 + 28}" cy="75" r="7" fill="${status.color}"/>
  <text x="${W - 56 - 190 + 46}" y="83" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="2" fill="${status.color}">${status.text}</text>

  <circle cx="${cx}" cy="${cy}" r="116" fill="none" stroke="${ACCENT}" stroke-width="5"/>
  ${hasPhoto ? "" : `<circle cx="${cx}" cy="${cy}" r="108" fill="#334155"/><text x="${cx}" y="${cy + 30}" text-anchor="middle" font-family="${FONT}" font-size="96" font-weight="700" fill="#ffffff">${initial}</text>`}

  <text x="320" y="226" font-family="${FONT}" font-size="${nameSize}" font-weight="700" fill="#ffffff">${U.esc(name)}</text>
  ${label(320, 292, "MEMBER ID")}${value(320, 330, member.member_code, 32)}
  ${label(320, 378, "PLAN")}${value(320, 414, clip(member.plan_name || "No active plan", 26), 28)}
  ${label(320, 454, "VALID")}${value(320, 488, validity, 26)}

  <text x="${W - 56 - 85}" y="${H - 118 - 22}" text-anchor="middle" font-family="${FONT}" font-size="14" letter-spacing="3" fill="#94a3b8">SCAN AT ENTRY</text>

  ${owner ? label(56, FY + 34, "OWNER", 14) + small(56, FY + 62, owner, 23) : ""}
  ${phone ? label(318, FY + 34, "PHONE", 14) + small(318, FY + 62, phone, 23) : ""}
  ${email ? label(556, FY + 34, "EMAIL", 14) + small(556, FY + 62, email, 22) : ""}
  ${address ? `<text x="56" y="${H - 22}" font-family="${FONT}" font-size="19" fill="#cbd5e1">${U.esc(address)}</text>` : ""}
</svg>`;
}

async function renderCard({ venue, member, photo, identity }) {
  const id = identity || {
    name: venue.hall_name, owner: venue.owner_name || "", phone: venue.phone || "", email: "",
    address: [venue.address, venue.city].filter(Boolean).join(", ")
  };
  let round = null;
  if (photo) {
    try { round = await roundPhoto(photo, 216); } catch { round = null; }
  }
  const layers = [];
  if (round) layers.push({ input: round, left: 56, top: 165 });

  // QR sits on a white tile so it scans on any background.
  const qr = await QRCode.toBuffer(String(member.member_code), { width: 150, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } });
  const tile = await sharp({ create: { width: 170, height: 170, channels: 4, background: "#ffffff" } })
    .composite([{ input: qr, left: 10, top: 10 }]).png().toBuffer();
  layers.push({ input: tile, left: W - 56 - 170, top: 290 });

  return sharp(Buffer.from(buildSvg({ id, member, hasPhoto: !!round })))
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