// Student ID card (PNG) with photo, seat, shift and a QR of the student ID.
const sharp = require("sharp");
const axios = require("axios");
const QRCode = require("qrcode");
const { sequelize } = require("../../config/database");
const { QueryTypes } = require("sequelize");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const { gymIdentity } = require("../gym/gym.brand");
const core = require("./library.core");

const W = 1012;
const H = 638;
const FONT = "DejaVu Sans, Arial, Helvetica, sans-serif";

async function loadPhoto(url) {
  const base = String(process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (!url || !base || !String(url).startsWith(`${base}/`)) return null;
  try {
    const r = await axios.get(url, { responseType: "arraybuffer", timeout: 5000, maxContentLength: 5 * 1024 * 1024, maxRedirects: 0 });
    return Buffer.from(r.data);
  } catch { return null; }
}

const roundPhoto = (buf, d) => {
  const mask = Buffer.from(`<svg width="${d}" height="${d}" xmlns="http://www.w3.org/2000/svg"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="#fff"/></svg>`);
  return sharp(buf).rotate().resize(d, d, { fit: "cover" }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
};

const trunc = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));

async function studentCardPng(ctx, studentId, res) {
  const s = await core.findStudent(ctx.venue.id, studentId);
  const [alloc] = await sequelize.query(
    `SELECT a.seat_no, h.name AS hall_name, sh.name AS shift_name, sh.start_time, sh.end_time
       FROM lib_allocations a JOIN lib_halls h ON h.id = a.hall_id JOIN lib_shifts sh ON sh.id = a.shift_id
      WHERE a.student_id = :s AND a.status = 'active'`,
    { replacements: { s: s.id }, type: QueryTypes.SELECT }
  );
  const id = await gymIdentity(ctx.venue);
  const lib = String((id && id.name) || ctx.venue.hall_name || "Library");
  const e = U.esc;

  const line = (label, value, y) => `<text x="300" y="${y}" font-size="19" fill="#94a3b8" font-family="${FONT}">${e(label)}</text>
    <text x="300" y="${y + 30}" font-size="27" font-weight="700" fill="#ffffff" font-family="${FONT}">${e(value)}</text>`;

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#1e293b"/></linearGradient></defs>
  <rect width="${W}" height="${H}" rx="34" fill="url(#g)"/>
  <rect width="${W}" height="104" rx="34" fill="#0b1b3a"/><rect y="70" width="${W}" height="34" fill="#0b1b3a"/>
  <text x="40" y="64" font-size="34" font-weight="700" fill="#ffffff" font-family="${FONT}">${e(trunc(lib, 34))}</text>
  <text x="${W - 40}" y="64" font-size="20" text-anchor="end" fill="#38bdf8" font-family="${FONT}">STUDENT CARD</text>
  <text x="300" y="168" font-size="40" font-weight="700" fill="#ffffff" font-family="${FONT}">${e(trunc(s.name, 24))}</text>
  <text x="300" y="204" font-size="22" fill="#38bdf8" font-family="${FONT}">ID  ${e(s.student_code)}</text>
  ${line("Shift", alloc ? `${alloc.shift_name}  ${core.fmt12(alloc.start_time)} - ${core.fmt12(alloc.end_time)}` : "Not allotted", 262)}
  ${line("Hall / Seat", alloc ? `${alloc.hall_name}  /  Seat ${alloc.seat_no}` : "-", 340)}
  ${line("Valid till", s.end_date ? U.fmtDate(s.end_date) : "-", 418)}
  <rect y="${H - 70}" width="${W}" height="70" rx="0" fill="#020617" opacity="0.55"/>
  <text x="40" y="${H - 28}" font-size="20" fill="#cbd5e1" font-family="${FONT}">${e(ctx.venue.phone ? `Helpline: ${ctx.venue.phone}` : "Please carry this card every day")}</text>
</svg>`;

  const layers = [];
  const photo = await loadPhoto(s.photo_url);
  const circle = 190;
  if (photo) {
    try { layers.push({ input: await roundPhoto(photo, circle), left: 50, top: 150 }); } catch { /* card still renders */ }
  }
  if (!photo || !layers.length) {
    const initials = e(s.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase());
    layers.push({ input: Buffer.from(`<svg width="${circle}" height="${circle}" xmlns="http://www.w3.org/2000/svg"><circle cx="${circle / 2}" cy="${circle / 2}" r="${circle / 2}" fill="#334155"/><text x="50%" y="58%" font-size="72" font-weight="700" text-anchor="middle" fill="#fff" font-family="${FONT}">${initials}</text></svg>`), left: 50, top: 150 });
  }
  const qr = await QRCode.toBuffer(s.student_code, { width: 150, margin: 1, errorCorrectionLevel: "M" });
  layers.push({ input: Buffer.from(`<svg width="170" height="170" xmlns="http://www.w3.org/2000/svg"><rect width="170" height="170" rx="14" fill="#fff"/></svg>`), left: W - 210, top: 330 });
  layers.push({ input: qr, left: W - 200, top: 340 });

  const png = await sharp(Buffer.from(svg)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", `attachment; filename="${s.student_code}-card.png"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.send(png);
}

module.exports = { studentCardPng, AppError };