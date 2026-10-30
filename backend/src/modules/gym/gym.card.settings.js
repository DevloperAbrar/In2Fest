const { AppError } = require("../../middleware/error.middleware");
const { GymCardSettings } = require("./gym.card.models");

const THEMES = { classic: "Classic Dark", light: "Clean Light", gold: "Royal Gold", ocean: "Ocean Blue" };
const SHOW_KEYS = ["logo", "gym_name", "status", "photo", "member_id", "plan", "valid", "owner", "phone", "email", "address", "achievements", "shift"];
const DEFAULT_TITLE = "MEMBERSHIP CARD";
const MAX_ACHIEVEMENTS = 4;

const defaults = () => ({
  theme: "classic",
  accent: null,
  title: DEFAULT_TITLE,
  show: SHOW_KEYS.reduce((o, k) => ({ ...o, [k]: k !== "achievements" && k !== "shift" }), {}),
  achievements: []
});

const clean = (v, max) =>
  String(v == null ? "" : v).replace(/[^\p{L}\p{N}\p{M} .,&'+\-/()%:#!@₹★]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);

function normalize(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const base = defaults();
  const show = {};
  SHOW_KEYS.forEach((k) => { show[k] = r.show && typeof r.show[k] === "boolean" ? r.show[k] : base.show[k]; });
  return {
    theme: THEMES[r.theme] ? r.theme : base.theme,
    accent: typeof r.accent === "string" && /^#[0-9a-f]{6}$/i.test(r.accent) ? r.accent.toLowerCase() : null,
    title: clean(r.title, 24).toUpperCase() || DEFAULT_TITLE,
    show,
    achievements: (Array.isArray(r.achievements) ? r.achievements : []).map((a) => clean(a, 40)).filter(Boolean).slice(0, MAX_ACHIEVEMENTS)
  };
}

// Reading must never break a card: any problem falls back to the default design.
async function getConfig(venueId) {
  try {
    const row = await GymCardSettings.findByPk(venueId);
    return normalize(row && row.config);
  } catch (e) {
    console.error("[GYM CARD] settings read failed:", e.message);
    return normalize({});
  }
}

function validate(b) {
  if (!b || typeof b !== "object") throw new AppError("Invalid card settings", 400);
  if (b.theme !== undefined && !THEMES[b.theme]) throw new AppError("Choose a valid card theme", 400);
  if (b.accent && !/^#[0-9a-f]{6}$/i.test(String(b.accent))) throw new AppError("Accent colour must look like #dc2626", 400);
  if (b.achievements !== undefined && (!Array.isArray(b.achievements) || b.achievements.length > MAX_ACHIEVEMENTS)) {
    throw new AppError(`Add up to ${MAX_ACHIEVEMENTS} achievements`, 400);
  }
}

async function saveConfig(venueId, body) {
  validate(body);
  const config = normalize(body);
  await GymCardSettings.upsert({ venue_id: venueId, config });
  return config;
}

async function resetConfig(venueId) {
  await GymCardSettings.destroy({ where: { venue_id: venueId } });
  return normalize({});
}

const publicConfig = (config) => ({
  ...config,
  themes: Object.entries(THEMES).map(([key, label]) => ({ key, label })),
  max_achievements: MAX_ACHIEVEMENTS,
  default_title: DEFAULT_TITLE
});

module.exports = { THEMES, SHOW_KEYS, normalize, getConfig, saveConfig, resetConfig, publicConfig };