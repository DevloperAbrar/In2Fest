export const DAYS = [
    { key: "mon", label: "Monday", short: "Mon" },
    { key: "tue", label: "Tuesday", short: "Tue" },
    { key: "wed", label: "Wednesday", short: "Wed" },
    { key: "thu", label: "Thursday", short: "Thu" },
    { key: "fri", label: "Friday", short: "Fri" },
    { key: "sat", label: "Saturday", short: "Sat" },
    { key: "sun", label: "Sunday", short: "Sun" }
  ];
  
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  
  const toMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  
  export function buildWeek(openDays, open, close) {
    const days = {};
    DAYS.forEach((d) => {
      days[d.key] = openDays.includes(d.key)
        ? { closed: false, shifts: [{ open, close }] }
        : { closed: true, shifts: [] };
    });
    return days;
  }
  
  export function defaultBusinessHours() {
    return {
      enabled: true,
      always_open: false,
      note: "",
      days: buildWeek(["mon", "tue", "wed", "thu", "fri", "sat"], "09:00", "18:00")
    };
  }
  
  export function normalizeBusinessHours(input) {
    const base = defaultBusinessHours();
    if (!input || typeof input !== "object") return base;
    const days = {};
    DAYS.forEach((d) => {
      const src = input.days?.[d.key];
      if (!src) {
        days[d.key] = base.days[d.key];
        return;
      }
      const closed = src.closed === true;
      const shifts = Array.isArray(src.shifts)
        ? src.shifts.filter((s) => s && s.open && s.close).map((s) => ({ open: s.open, close: s.close }))
        : [];
      days[d.key] = {
        closed,
        shifts: closed ? [] : shifts.length ? shifts : [{ open: "09:00", close: "18:00" }]
      };
    });
    return {
      enabled: input.enabled !== false,
      always_open: input.always_open === true,
      note: typeof input.note === "string" ? input.note : "",
      days
    };
  }
  
  export function formatTime(t) {
    if (!TIME_RE.test(t || "")) return "";
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ap}`;
  }
  
  const minToTime = (mins) => {
    const m = ((mins % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  
  // Mirrors the server validation so vendors see the problem before saving.
  export function validateBusinessHours(h) {
    if (h.always_open) return "";
    for (const d of DAYS) {
      const day = h.days[d.key];
      if (day.closed) continue;
      const shifts = day.shifts || [];
      if (!shifts.length) return `${d.label}: add opening and closing time, or mark it Closed`;
      for (const s of shifts) {
        if (!TIME_RE.test(s.open || "") || !TIME_RE.test(s.close || "")) {
          return `${d.label}: enter a valid opening and closing time`;
        }
        if (s.open === s.close) return `${d.label}: opening and closing time can't be the same`;
      }
      if (shifts.length === 2) {
        const sorted = [...shifts].sort((a, b) => toMin(a.open) - toMin(b.open));
        const o = toMin(sorted[0].open);
        const c = toMin(sorted[0].close);
        const end = c > o ? c : c + 1440;
        if (toMin(sorted[1].open) < end) return `${d.label}: the two time ranges overlap`;
      }
    }
    return "";
  }
  
  // Current day + minutes in India time, regardless of the visitor's timezone.
  export function getIstParts(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(now);
    const get = (t) => parts.find((p) => p.type === t)?.value || "0";
    return {
      dayKey: get("weekday").slice(0, 3).toLowerCase(),
      minutes: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10)
    };
  }
  
  // -> { isOpen, label, detail }
  export function getOpenStatus(hoursInput, now = new Date()) {
    const h = normalizeBusinessHours(hoursInput);
    if (h.always_open) return { isOpen: true, label: "Open 24 hours", detail: "Every day" };
  
    const { dayKey, minutes: m } = getIstParts(now);
    const idx = DAYS.findIndex((d) => d.key === dayKey);
    const today = h.days[dayKey];
    const yesterday = h.days[DAYS[(idx + 6) % 7].key];
  
    if (today && !today.closed) {
      for (const s of today.shifts) {
        const o = toMin(s.open);
        const c = toMin(s.close);
        if (c > o ? m >= o && m < c : m >= o) {
          return { isOpen: true, label: "Open now", detail: `Closes at ${formatTime(s.close)}` };
        }
      }
    }
  
    if (yesterday && !yesterday.closed) {
      for (const s of yesterday.shifts) {
        const o = toMin(s.open);
        const c = toMin(s.close);
        if (c <= o && m < c) {
          return { isOpen: true, label: "Open now", detail: `Closes at ${formatTime(s.close)}` };
        }
      }
    }
  
    if (today && !today.closed) {
      const next = today.shifts.map((s) => toMin(s.open)).filter((o) => o > m).sort((a, b) => a - b)[0];
      if (next !== undefined) {
        return { isOpen: false, label: "Closed", detail: `Opens today at ${formatTime(minToTime(next))}` };
      }
    }
  
    for (let i = 1; i <= 7; i++) {
      const d = DAYS[(idx + i) % 7];
      const day = h.days[d.key];
      if (day && !day.closed && day.shifts.length) {
        const first = [...day.shifts].sort((a, b) => toMin(a.open) - toMin(b.open))[0];
        return {
          isOpen: false,
          label: "Closed",
          detail: i === 1 ? `Opens tomorrow at ${formatTime(first.open)}` : `Opens ${d.label} at ${formatTime(first.open)}`
        };
      }
    }
  
    return { isOpen: false, label: "Closed", detail: "" };
  }