// Registry of every body measurement, health reading, treadmill test and strength test used by the
// Gym "Body Measurement" tool. To add a new reading, add ONE line to METRICS: no table, migration
// or route change is needed (values are stored as generic JSON per measurement day).
//
// Everything is stored in metric units (kg, cm, seconds). The screen and the PDF can show lengths in inches.
// Derived numbers (BMI, ratios, estimated body fat ...) are never stored; they are calculated on read.

const CM_PER_IN = 2.54;

const GROUPS = [
  { key: "size", label: "Body size", hint: "Weight, height and tape measurements" },
  { key: "health", label: "Health & composition", hint: "Body fat, heart rate, blood pressure and similar" },
  { key: "cardio", label: "Cardio & treadmill", hint: "Sprints, runs, speed and recovery" },
  { key: "strength", label: "Strength & fitness", hint: "Lifts, reps, grip, flexibility and jumps" }
];

// kind: length (cm, can show as inches) | weight (kg) | time (seconds, shown as m:ss) | number | pct
// better: lower | higher | none   (none = neither direction is "good", e.g. chest or weight)
// sex: "m" or "f" = shown only for that gender; missing = everyone. label_f = label used for women.
// pair + side: two readings shown side by side (right / left).
const m = (group, key, label, unit, kind, min, max, o = {}) => ({ group, key, label, unit, kind, min, max, decimals: 1, better: "none", ...o });

const METRICS = [
  // ---------- body size ----------
  m("size", "weight", "Weight", "kg", "weight", 20, 300),
  m("size", "height", "Height", "cm", "length", 90, 250),
  m("size", "neck", "Neck", "cm", "length", 20, 70),
  m("size", "shoulder", "Shoulder", "cm", "length", 60, 200),
  m("size", "chest", "Chest", "cm", "length", 50, 200, { label_f: "Bust" }),
  m("size", "chest_expanded", "Chest (expanded)", "cm", "length", 50, 200, { sex: "m" }),
  m("size", "underbust", "Underbust", "cm", "length", 50, 150, { sex: "f" }),
  m("size", "waist", "Waist", "cm", "length", 40, 250, { better: "lower" }),
  m("size", "abdomen", "Abdomen (navel)", "cm", "length", 40, 250, { better: "lower" }),
  m("size", "upper_hip", "High hip", "cm", "length", 50, 250, { sex: "f" }),
  m("size", "hips", "Hips", "cm", "length", 50, 250),
  m("size", "arm_r", "Arm (biceps) - right", "cm", "length", 15, 80, { pair: "arm", pairLabel: "Arm (biceps)", side: "right" }),
  m("size", "arm_l", "Arm (biceps) - left", "cm", "length", 15, 80, { pair: "arm", pairLabel: "Arm (biceps)", side: "left" }),
  m("size", "forearm_r", "Forearm - right", "cm", "length", 15, 60, { pair: "forearm", pairLabel: "Forearm", side: "right" }),
  m("size", "forearm_l", "Forearm - left", "cm", "length", 15, 60, { pair: "forearm", pairLabel: "Forearm", side: "left" }),
  m("size", "wrist", "Wrist", "cm", "length", 8, 30),
  m("size", "thigh_r", "Thigh - right", "cm", "length", 25, 120, { pair: "thigh", pairLabel: "Thigh", side: "right" }),
  m("size", "thigh_l", "Thigh - left", "cm", "length", 25, 120, { pair: "thigh", pairLabel: "Thigh", side: "left" }),
  m("size", "calf_r", "Calf - right", "cm", "length", 20, 70, { pair: "calf", pairLabel: "Calf", side: "right" }),
  m("size", "calf_l", "Calf - left", "cm", "length", 20, 70, { pair: "calf", pairLabel: "Calf", side: "left" }),

  // ---------- health & composition ----------
  m("health", "body_fat", "Body fat", "%", "pct", 2, 70, { better: "lower" }),
  m("health", "muscle_mass", "Skeletal muscle", "kg", "weight", 10, 100, { better: "higher" }),
  m("health", "visceral_fat", "Visceral fat", "level", "number", 1, 59, { better: "lower", decimals: 0 }),
  m("health", "body_water", "Body water", "%", "pct", 30, 80),
  m("health", "bmr", "BMR", "kcal", "number", 600, 4000, { decimals: 0 }),
  m("health", "metabolic_age", "Metabolic age", "yrs", "number", 10, 90, { better: "lower", decimals: 0 }),
  m("health", "resting_hr", "Resting heart rate", "bpm", "number", 30, 220, { better: "lower", decimals: 0 }),
  m("health", "bp_sys", "Blood pressure - systolic", "mmHg", "number", 60, 260, { better: "lower", decimals: 0 }),
  m("health", "bp_dia", "Blood pressure - diastolic", "mmHg", "number", 30, 160, { better: "lower", decimals: 0 }),
  m("health", "spo2", "SpO2 (oxygen)", "%", "pct", 70, 100, { better: "higher", decimals: 0 }),

  // ---------- cardio & treadmill ----------
  m("cardio", "sprint_100m", "100 m sprint", "s", "time", 8, 120, { better: "lower" }),
  m("cardio", "sprint_200m", "200 m sprint", "s", "time", 15, 200, { better: "lower" }),
  m("cardio", "sprint_400m", "400 m sprint", "s", "time", 30, 400, { better: "lower" }),
  m("cardio", "run_800m", "800 m run", "s", "time", 90, 1800, { better: "lower" }),
  m("cardio", "run_1km", "1 km run", "s", "time", 120, 2400, { better: "lower" }),
  m("cardio", "run_2_4km", "2.4 km run", "s", "time", 300, 3600, { better: "lower" }),
  m("cardio", "cooper_12min", "12-min run (Cooper), distance", "m", "number", 300, 5000, { better: "higher", decimals: 0 }),
  m("cardio", "max_speed", "Max treadmill speed", "km/h", "number", 3, 40, { better: "higher" }),
  m("cardio", "max_incline", "Max incline held", "%", "number", 0, 40, { better: "higher" }),
  m("cardio", "hr_recovery", "Heart-rate drop in 1 min", "bpm", "number", 0, 100, { better: "higher", decimals: 0 }),
  m("cardio", "vo2max", "VO2 max (measured)", "ml/kg/min", "number", 10, 95, { better: "higher" }),

  // ---------- strength & fitness ----------
  m("strength", "bench_1rm", "Bench press (1RM)", "kg", "number", 5, 600, { better: "higher" }),
  m("strength", "squat_1rm", "Squat (1RM)", "kg", "number", 5, 800, { better: "higher" }),
  m("strength", "deadlift_1rm", "Deadlift (1RM)", "kg", "number", 5, 900, { better: "higher" }),
  m("strength", "ohp_1rm", "Overhead press (1RM)", "kg", "number", 5, 400, { better: "higher" }),
  m("strength", "pushups", "Push-ups (max)", "reps", "number", 0, 500, { better: "higher", decimals: 0 }),
  m("strength", "pullups", "Pull-ups (max)", "reps", "number", 0, 200, { better: "higher", decimals: 0 }),
  m("strength", "situps_60s", "Sit-ups in 60 s", "reps", "number", 0, 200, { better: "higher", decimals: 0 }),
  m("strength", "plank", "Plank hold", "s", "time", 0, 7200, { better: "higher" }),
  m("strength", "grip_r", "Grip strength - right", "kg", "number", 2, 150, { better: "higher", pair: "grip", pairLabel: "Grip strength", side: "right" }),
  m("strength", "grip_l", "Grip strength - left", "kg", "number", 2, 150, { better: "higher", pair: "grip", pairLabel: "Grip strength", side: "left" }),
  m("strength", "sit_reach", "Sit and reach", "cm", "number", -40, 60, { better: "higher" }),
  m("strength", "vertical_jump", "Vertical jump", "cm", "number", 5, 120, { better: "higher" }),
  m("strength", "broad_jump", "Standing broad jump", "cm", "number", 40, 400, { better: "higher" })
];

const INDEX = new Map(METRICS.map((x) => [x.key, x]));
const get = (key) => INDEX.get(key) || null;
const publicConfig = () => ({ groups: GROUPS, metrics: METRICS });

/* ------------------------------ numbers ------------------------------ */

const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const num = (v) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

// "72", "72 kg", "158 lbs"  ->  kg  (null when it does not look like a real weight)
function parseWeightKg(raw) {
  const s = String(raw == null ? "" : raw).toLowerCase().replace(",", ".");
  const hit = s.match(/(\d{1,3}(?:\.\d+)?)/);
  if (!hit) return null;
  let kg = Number(hit[1]);
  if (/lb|pound/.test(s)) kg *= 0.45359237;
  kg = r1(kg);
  return kg >= 20 && kg <= 300 ? kg : null;
}

// "172", "172 cm", "5'8", "5 ft 8 in", "5.8" (meaning 5 ft 8 in), "1.72 m"  ->  cm
function parseHeightCm(raw) {
  const s = String(raw == null ? "" : raw).toLowerCase().trim().replace(",", ".");
  if (!s) return null;
  let cm = null;
  let hit = s.match(/^(\d)\s*(?:ft|feet|foot|')\s*(\d{1,2})?/);
  if (hit) cm = Number(hit[1]) * 30.48 + (hit[2] ? Number(hit[2]) * CM_PER_IN : 0);
  else if ((hit = s.match(/^(\d)\.(\d{1,2})$/)) && Number(hit[1]) >= 4 && Number(hit[1]) <= 7 && Number(hit[2]) <= 11) cm = Number(hit[1]) * 30.48 + Number(hit[2]) * CM_PER_IN;
  else if ((hit = s.match(/^(\d\.\d{1,2})\s*m$/))) cm = Number(hit[1]) * 100;
  else if ((hit = s.match(/^(\d{2,3}(?:\.\d+)?)/))) cm = Number(hit[1]);
  if (cm === null || !Number.isFinite(cm)) return null;
  cm = r1(cm);
  return cm >= 90 && cm <= 250 ? cm : null;
}

/* ------------------------------ classification ------------------------------ */
// Tone: good | warn | bad | neutral.  BMI and waist limits are the WHO Asia-Pacific ones (used in India).

const sexOf = (gender) => (gender === "male" ? "male" : gender === "female" ? "female" : null);

function bmiClass(b) {
  if (b < 18.5) return { label: "Underweight", tone: "warn" };
  if (b < 23) return { label: "Healthy", tone: "good" };
  if (b < 25) return { label: "Overweight", tone: "warn" };
  return { label: "Obese", tone: "bad" };
}

function bodyFatClass(sex, bf) {
  if (!sex) return null;
  const t = sex === "male" ? [6, 14, 18, 25] : [14, 21, 25, 32];
  if (bf < t[0]) return { label: "Essential fat", tone: "warn" };
  if (bf < t[1]) return { label: "Athletic", tone: "good" };
  if (bf < t[2]) return { label: "Fit", tone: "good" };
  if (bf < t[3]) return { label: "Average", tone: "neutral" };
  return { label: "High", tone: "bad" };
}

const waistClass = (sex, w) => (!sex ? null : w >= (sex === "male" ? 90 : 80) ? { label: "Higher health risk", tone: "bad" } : { label: "Healthy range", tone: "good" });
const whrClass = (sex, r) => (!sex ? null : r >= (sex === "male" ? 0.9 : 0.85) ? { label: "Higher risk", tone: "bad" } : { label: "Healthy range", tone: "good" });
const whtrClass = (r) => (r >= 0.5 ? { label: "Above 0.5, reduce waist", tone: "warn" } : { label: "Healthy range", tone: "good" });

function bpClass(sys, dia) {
  if (sys >= 140 || dia >= 90) return { label: "High (stage 2)", tone: "bad" };
  if (sys >= 130 || dia >= 80) return { label: "High (stage 1)", tone: "warn" };
  if (sys >= 120) return { label: "Elevated", tone: "warn" };
  if (sys < 90 || dia < 60) return { label: "Low", tone: "warn" };
  return { label: "Normal", tone: "good" };
}

const rhrClass = (h) => (h < 60 ? { label: "Low (athletic)", tone: "good" } : h <= 100 ? { label: "Normal", tone: "good" } : { label: "High", tone: "bad" });
const spo2Class = (s) => (s >= 95 ? { label: "Normal", tone: "good" } : s >= 90 ? { label: "Slightly low", tone: "warn" } : { label: "Low, see a doctor", tone: "bad" });

/* ------------------------------ derived values ------------------------------ */

// v = { key: number }  ctx = { sex: "male" | "female" | null, height: cm | null }
function derive(v, ctx = {}) {
  const sex = ctx.sex || null;
  const h = num(v.height) || num(ctx.height);
  const weight = num(v.weight);
  const waist = num(v.waist);
  const hips = num(v.hips);
  const neck = num(v.neck);
  const out = {};

  if (weight && h) out.bmi = r1(weight / ((h / 100) * (h / 100)));
  if (waist && hips) out.whr = r2(waist / hips);
  if (waist && h) out.whtr = r2(waist / h);

  let bf = num(v.body_fat);
  let bfSource = bf !== null ? "measured" : null;
  if (bf === null && sex && h && waist && neck) {
    // US Navy circumference method, centimetre version
    let est = null;
    if (sex === "male" && waist > neck) est = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)) - 450;
    if (sex === "female" && hips && waist + hips > neck) est = 495 / (1.29579 - 0.35004 * Math.log10(waist + hips - neck) + 0.221 * Math.log10(h)) - 450;
    if (est !== null && Number.isFinite(est) && est >= 2 && est <= 60) { bf = r1(est); bfSource = "estimated"; }
  }
  if (bf !== null) {
    out.body_fat = bf;
    out.body_fat_source = bfSource;
    if (weight) { out.fat_mass = r1((weight * bf) / 100); out.lean_mass = r1(weight - out.fat_mass); }
  }

  const vo2 = num(v.vo2max);
  const cooper = num(v.cooper_12min);
  if (vo2 !== null) { out.vo2 = vo2; out.vo2_source = "measured"; }
  else if (cooper !== null) {
    const est = (cooper - 504.9) / 44.73; // Cooper 12-minute run formula
    if (est >= 10 && est <= 90) { out.vo2 = r1(est); out.vo2_source = "estimated"; }
  }

  const b = num(v.bench_1rm), s = num(v.squat_1rm), d = num(v.deadlift_1rm);
  if (b !== null && s !== null && d !== null) out.total_lift = r1(b + s + d);
  if (weight) {
    if (b !== null) out.rel_bench = r2(b / weight);
    if (s !== null) out.rel_squat = r2(s / weight);
    if (d !== null) out.rel_deadlift = r2(d / weight);
  }
  return out;
}

// Plain-language health insights shown on screen and in the PDF.
function insightsFor(v, ctx = {}) {
  const sex = ctx.sex || null;
  const dv = derive(v, ctx);
  const list = [];
  const add = (key, label, value, cls, note) => list.push({ key, label, value, note: note || (cls ? cls.label : ""), tone: cls ? cls.tone : "neutral" });

  if (dv.bmi !== undefined) add("bmi", "BMI", String(dv.bmi), bmiClass(dv.bmi), `${bmiClass(dv.bmi).label} (Asian cut-offs)`);
  const waist = num(v.waist);
  if (waist !== null && sex) add("waist", "Waist", `${r1(waist)} cm`, waistClass(sex, waist));
  if (dv.whr !== undefined) add("whr", "Waist to hip ratio", String(dv.whr), whrClass(sex, dv.whr));
  if (dv.whtr !== undefined) add("whtr", "Waist to height ratio", String(dv.whtr), whtrClass(dv.whtr));
  if (dv.body_fat !== undefined) {
    const cls = bodyFatClass(sex, dv.body_fat);
    add("body_fat", dv.body_fat_source === "estimated" ? "Body fat (estimated)" : "Body fat", `${dv.body_fat}%`, cls, cls ? cls.label : "Set gender for the range");
  }
  if (num(v.bp_sys) !== null && num(v.bp_dia) !== null) add("bp", "Blood pressure", `${Math.round(v.bp_sys)}/${Math.round(v.bp_dia)} mmHg`, bpClass(v.bp_sys, v.bp_dia));
  if (num(v.resting_hr) !== null) add("rhr", "Resting heart rate", `${Math.round(v.resting_hr)} bpm`, rhrClass(v.resting_hr));
  if (num(v.spo2) !== null) add("spo2", "SpO2", `${Math.round(v.spo2)}%`, spo2Class(v.spo2));
  if (dv.vo2 !== undefined) add("vo2", dv.vo2_source === "estimated" ? "VO2 max (estimated)" : "VO2 max", `${dv.vo2} ml/kg/min`, null, dv.vo2_source === "estimated" ? "From the 12-minute run" : "Measured");
  if (dv.total_lift !== undefined) add("total", "Big-3 total", `${dv.total_lift} kg`, null, "Bench + squat + deadlift");
  if (dv.rel_squat !== undefined) add("rel_squat", "Squat vs body weight", `${dv.rel_squat}x`, null, "");
  return { derived: dv, insights: list };
}

module.exports = { CM_PER_IN, GROUPS, METRICS, get, publicConfig, parseWeightKg, parseHeightCm, sexOf, derive, insightsFor, bmiClass, num, r1, r2 };