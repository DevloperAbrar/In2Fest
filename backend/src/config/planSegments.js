// Which business types a plan can be limited to.
// plans.segments = []  -> the plan is shown to every business type (what every old plan has).
// plans.segments = ["library"] -> only Library vendors can pick it.
const { segmentForCategory } = require("./vendorSegments");

const PLAN_SEGMENTS = [
  { key: "gym", label: "Gym & Fitness" },
  { key: "academy", label: "Sports Academy" },
  { key: "studio", label: "Classes & Studios" },
  { key: "library", label: "Library & Study Room" }
];
const PLAN_SEGMENT_KEYS = PLAN_SEGMENTS.map((s) => s.key);

// "gym" | "academy" | "studio" | "library" | "food" ... or null for a category with no segment.
function segmentKeyForCategory(slug) {
  const seg = segmentForCategory(slug);
  return seg ? seg.key : null;
}

// Returns undefined when nothing was sent (so the caller leaves the old value alone).
// Ticking all four is the same as ticking none: the plan is for everyone.
function normalizeSegments(input) {
  if (input === undefined) return undefined;
  const list = Array.isArray(input) ? input : [];
  const clean = Array.from(new Set(list.map(String))).filter((k) => PLAN_SEGMENT_KEYS.includes(k));
  return clean.length === PLAN_SEGMENT_KEYS.length ? [] : clean;
}

function planAvailableFor(plan, segmentKey) {
  const list = Array.isArray(plan.segments) ? plan.segments : [];
  if (list.length === 0) return true;
  return Boolean(segmentKey) && list.includes(segmentKey);
}
 
module.exports = { PLAN_SEGMENTS, PLAN_SEGMENT_KEYS, segmentKeyForCategory, normalizeSegments, planAvailableFor };