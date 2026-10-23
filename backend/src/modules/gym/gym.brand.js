const axios = require("axios");
const { User } = require("../../database/models");

// One palette for the membership card, receipt, invoice and workout PDF.
const T = {
  ink: "#0f172a",
  ink2: "#1e293b",
  text: "#111827",
  body: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  soft: "#f8fafc",
  accent: "#dc2626",
  accentSoft: "#fee2e2",
  green: "#16a34a",
  greenSoft: "#dcfce7"
};

function fmtPhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 10 ? d : null;
  return ten ? `+91 ${ten.slice(0, 5)} ${ten.slice(5)}` : String(raw || "").trim();
}

// The gym logo is stored as a PNG in our own storage. Only that storage is ever fetched.
async function loadLogo(url) {
  const base = String(process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (!url || !base || !String(url).startsWith(`${base}/`)) return null;
  try {
    const r = await axios.get(url, { responseType: "arraybuffer", timeout: 5000, maxContentLength: 3 * 1024 * 1024, maxRedirects: 0 });
    return Buffer.from(r.data);
  } catch {
    return null;
  }
}

// The gym's details exactly as the vendor saved them: owner name, gym name, phone,
// login email of the owner account and address.
async function gymIdentity(venue) {
  let email = "";
  try {
    const owner = await User.findByPk(venue.owner_id, { attributes: ["email"] });
    email = owner && owner.email ? owner.email : "";
  } catch {
    email = "";
  }
  const city = String(venue.city || "").trim();
  let address = String(venue.address || "").replace(/\s+/g, " ").trim();
  if (city && !address.toLowerCase().includes(city.toLowerCase())) address = [address, city].filter(Boolean).join(", ");
  return {
    name: String(venue.hall_name || "Your Gym").trim(),
    owner: String(venue.owner_name || "").trim(),
    phone: fmtPhone(venue.phone),
    email,
    address,
    gstin: venue.gst_enabled && venue.gst_number ? String(venue.gst_number).trim() : "",
    logo: await loadLogo(venue.logo_url)
  };
}

// Cuts text so it fits one line of the given width (pdfkit does not do this for single lines).
function clipTo(doc, text, width) {
  let s = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
  if (doc.widthOfString(s) <= width) return s;
  while (s.length > 1 && doc.widthOfString(`${s}...`) > width) s = s.slice(0, -1);
  return `${s.trim()}...`;
}

// Draws ONE line of text. pdfkit wraps text whenever a width is passed (even with lineBreak:false),
// so the width is only used here to align the line by hand.
function drawOne(doc, str, x, y, width, align, spacing = 0) {
  const w = doc.widthOfString(str, spacing ? { characterSpacing: spacing } : undefined);
  let xx = x;
  if (align === "right") xx = x + width - w;
  else if (align === "center") xx = x + (width - w) / 2;
  doc.text(str, xx, y, { lineBreak: false, characterSpacing: spacing || 0 });
}

// One line that SHRINKS the font until it fits the width (down to minSize) and only then cuts it.
// Used for long emails and names so nothing is lost or looks chopped.
function fitLine(doc, text, x, y, { font = "Helvetica", size = 9, minSize = 6.5, color = T.text, width = 200, align = "left" } = {}) {
  const str = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
  let fs = size;
  doc.font(font).fontSize(fs);
  while (fs > minSize && doc.widthOfString(str) > width) {
    fs = Math.max(minSize, fs - 0.25);
    doc.fontSize(fs);
  }
  doc.fillColor(color);
  drawOne(doc, clipTo(doc, str, width), x, y, width, align);
  return fs;
}

// Small spaced-out caps label.
function caps(doc, text, x, y, { color = T.faint, size = 6.5, width = 200, align = "left" } = {}) {
  doc.font("Helvetica-Bold").fontSize(size).fillColor(color);
  drawOne(doc, String(text).toUpperCase(), x, y, width, align, 1);
}

// One line of text that never wraps.
function line1(doc, text, x, y, { font = "Helvetica", size = 9, color = T.text, width = 200, align = "left" } = {}) {
  doc.font(font).fontSize(size).fillColor(color);
  drawOne(doc, clipTo(doc, text, width), x, y, width, align);
}

// Rounded pill with text. Returns its width so pills can be placed in a row.
function pill(doc, text, x, y, { bg = T.soft, fg = T.body, border = T.line, size = 8, font = "Helvetica-Bold", h = 18, padX = 9 } = {}) {
  doc.font(font).fontSize(size);
  const w = doc.widthOfString(text) + padX * 2;
  doc.save().roundedRect(x, y, w, h, h / 2).fillAndStroke(bg, border || bg).restore();
  doc.font(font).fontSize(size).fillColor(fg).text(text, x + padX, y + (h - size) / 2 + 0.5, { lineBreak: false });
  return w;
}

module.exports = { T, gymIdentity, fmtPhone, loadLogo, clipTo, fitLine, caps, line1, pill };