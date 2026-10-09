const { AppError } = require("../middleware/error.middleware");

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_NAMES = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday"
};
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// Validates and cleans opening hours. Returns null to clear them.
function sanitizeBusinessHours(input) {
  if (input === null) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("Opening hours format is invalid", 400);
  }

  const out = {
    enabled: input.enabled !== false,
    always_open: input.always_open === true,
    note: typeof input.note === "string" ? input.note.trim().slice(0, 160) : "",
    days: {}
  };
  const srcDays = input.days && typeof input.days === "object" ? input.days : {};

  DAY_KEYS.forEach((key) => {
    const src = srcDays[key] || {};
    const closed = src.closed === true;
    let shifts = [];

    if (!closed) {
      const raw = Array.isArray(src.shifts) ? src.shifts.slice(0, 2) : [];
      shifts = raw
        .filter((s) => s && TIME_RE.test(s.open) && TIME_RE.test(s.close))
        .map((s) => ({ open: s.open, close: s.close }));

      if (!out.always_open) {
        if (shifts.length === 0 || shifts.length !== raw.length) {
          throw new AppError(`${DAY_NAMES[key]}: enter a valid opening and closing time, or mark it Closed`, 400);
        }
        shifts.forEach((s) => {
          if (s.open === s.close) {
            throw new AppError(`${DAY_NAMES[key]}: opening and closing time can't be the same`, 400);
          }
        });
        if (shifts.length === 2) {
          const sorted = [...shifts].sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
          const firstOpen = toMinutes(sorted[0].open);
          const firstClose = toMinutes(sorted[0].close);
          const firstEnd = firstClose > firstOpen ? firstClose : firstClose + 1440;
          if (toMinutes(sorted[1].open) < firstEnd) {
            throw new AppError(`${DAY_NAMES[key]}: the two time ranges overlap`, 400);
          }
          shifts = sorted;
        }
      }
    }

    out.days[key] = { closed, shifts };
  });

  return out;
}

// Cleans the services list (icon is a key from the SVG icon library, or a legacy emoji).
function sanitizeServices(input) {
  if (!Array.isArray(input)) throw new AppError("Services must be a list", 400);
  if (input.length > 50) throw new AppError("You can add at most 50 services", 400);

  const seen = new Set();
  return input
    .map((s, i) => {
      const name = String(s?.name || "").trim().slice(0, 80);
      if (!name) return null;
      let id = String(s?.id || "").slice(0, 40) || `svc_${Date.now()}_${i}`;
      if (seen.has(id)) id = `${id}_${i}`;
      seen.add(id);
      return {
        id,
        name,
        description: String(s?.description || "").trim().slice(0, 300),
        icon: String(s?.icon || "").trim().slice(0, 40) || "sparkles",
        visible: s?.visible !== false
      };
    })
    .filter(Boolean);
}

module.exports = { sanitizeBusinessHours, sanitizeServices };