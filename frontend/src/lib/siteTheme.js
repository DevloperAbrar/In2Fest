// Decides how a public website handles light / dark mode.
//
// Aurora is a dark-only design and Bloom / Slate are light-only designs (their colours are
// fixed inside the template files), so those templates force a mode and hide the toggle.
// Classic and the gym / shop / food experiences let the visitor choose, and remember the choice.

const TEMPLATE_THEME = {
  aurora: { forced: "dark", navTop: "light" }, // dark hero  -> white navbar text on top
  bloom: { forced: "light", navTop: "ink" },   // light hero -> dark navbar text on top
  slate: { forced: "light", navTop: "light" }  // dark hero  -> white navbar text on top
};

// verticalKey: "gym" | "shop" | "food" | null  (only passed when that experience is really in use)
export function getSiteTheme(venue, verticalKey = null) {
  const t = TEMPLATE_THEME[venue?.template_id];
  if (t) return { id: venue.template_id, ...t };
  return { id: verticalKey || "classic", forced: null, navTop: "light" };
}

// Colour of the page behind everything (used for the mobile browser bar and overscroll area).
export function getSiteBackground(themeId, isDark) {
  if (themeId === "aurora") return "#06020f";
  if (themeId === "bloom") return "#faf7f2";
  if (themeId === "gym") return isDark ? "#09090b" : "#ffffff";
  if (themeId === "shop") return isDark ? "#0b0f0e" : "#ffffff";
  if (themeId === "food") return isDark ? "#0f0b09" : "#ffffff";
  return isDark ? "#0c0a09" : "#ffffff";
}

const KEY = "in2fest-site-mode";

export function readStoredMode() {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

export function storeMode(mode) {
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    /* private mode: ignore */
  }
}