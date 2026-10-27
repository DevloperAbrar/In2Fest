const crypto = require("crypto");
const env = require("../../config/env");
const { AppError } = require("../../middleware/error.middleware");
const { DEFAULT_MESSAGES } = require("./gym.constants");

const IST_MS = 330 * 60 * 1000;
const DAY_MS = 86400000;
const toMs = (ymd) => Date.parse(`${ymd}T00:00:00Z`);

const todayIST = () => new Date(Date.now() + IST_MS).toISOString().slice(0, 10);
const isYmd = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toMs(v));
const addDays = (ymd, n) => new Date(toMs(ymd) + n * DAY_MS).toISOString().slice(0, 10);
const diffDays = (from, to) => Math.round((toMs(to) - toMs(from)) / DAY_MS);

function addMonths(ymd, m) {
  const d = new Date(toMs(ymd));
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + m);
  if (d.getUTCDate() !== day) d.setUTCDate(0); // Jan 31 + 1 month => Feb 28/29
  return d.toISOString().slice(0, 10);
}

// A 1-month plan starting 1 Jan ends 31 Jan.
const membershipEnd = (start, unit, value) =>
  unit === "months" ? addDays(addMonths(start, value), -1) : addDays(start, value - 1);

function normalizePhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) throw new AppError("Enter a valid 10-digit mobile number", 400);
  return d;
}

// Tolerant version for owner numbers stored in free-form (venue.phone etc.)
function waFromAny(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  return d.length >= 10 ? d : null;
}
const waNumber = (phone10) => `91${phone10}`;

function num(v, field, { min = 0, max = 10000000, int = false } = {}) {
  const n = Number(v);
  if (v === "" || v === null || v === undefined || Number.isNaN(n) || n < min || n > max || (int && !Number.isInteger(n))) {
    throw new AppError(`${field} is invalid`, 400);
  }
  return n;
}

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inr = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (ymd) =>
  new Date(toMs(ymd)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "";
const token = () => crypto.randomBytes(18).toString("base64url");
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const likeEscape = (s) => String(s).trim().replace(/[\\%_]/g, "\\$&");

// Public base of the API, used inside WhatsApp links. Set API_PUBLIC_URL to override.
const publicApiBase = () => (process.env.API_PUBLIC_URL || `https://${env.baseDomain}/api`).replace(/\/$/, "");

const render = (tpl, vars = {}) => String(tpl).replace(/{{\s*(\w+)\s*}}/g, (_, k) => (vars[k] ?? ""));
const msg = (settings, key, vars) =>
  render((settings && settings.message_templates && settings.message_templates[key]) || DEFAULT_MESSAGES[key], vars);
const renewLink = (member) => `${publicApiBase()}/public/gym/renew/${member.portal_token}`;
const cardLink = (member) => `${publicApiBase()}/public/gym/card/${member.portal_token}`;

/* AES-256-GCM for vendor-supplied secrets (Razorpay key secret) */
const secretKey = () => crypto.createHash("sha256").update(`${env.jwt.secret}:gym-secrets`).digest();
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([c.update(String(text), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
function decrypt(payload) {
  const [iv, tag, enc] = String(payload).split(".").map((p) => Buffer.from(p, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", secretKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

module.exports = {
  todayIST, isYmd, addDays, addMonths, diffDays, membershipEnd, normalizePhone, waFromAny, waNumber,
  num, money, inr, fmtDate, firstName, token, esc, likeEscape, publicApiBase, renewLink, cardLink, msg, encrypt, decrypt
};