// Registry of every sport (Sports Academy) and class type (Classes & Studios).
// To add a new sport or class type, add ONE entry to DISCIPLINES. No table, migration or
// route change is needed: profile fields, levels and test results are stored as generic JSON.
//
// Test key format: "<discipline>.<test>" (built-in) or "custom.<id>" (vendor-created).

const measure = (key, label, unit, better) => ({ key, label, unit, better, kind: "measure" });
const rating = (key, label) => ({ key, label, unit: "/5", better: "higher", kind: "rating" });
const select = (key, label, options) => ({ key, label, type: "select", options });
const text = (key, label, max = 40) => ({ key, label, type: "text", max });

const LEVELS_3 = ["Beginner", "Intermediate", "Advanced"];
const HAND = ["Right", "Left"];

// Fitness tests used by every sport (SAI / Khelo India style test battery).
const COMMON_FITNESS = [
  measure("sprint_30m", "30 m sprint", "s", "lower"),
  measure("sprint_100m", "100 m sprint", "s", "lower"),
  measure("run_600m", "600 m run", "s", "lower"),
  measure("shuttle_5_10_5", "5-10-5 agility shuttle", "s", "lower"),
  measure("yoyo_level", "Yo-Yo test level", "level", "higher"),
  measure("vertical_jump", "Vertical jump", "cm", "higher"),
  measure("broad_jump", "Standing broad jump", "cm", "higher"),
  measure("sit_reach", "Sit and reach", "cm", "higher"),
  measure("pushups_60s", "Push-ups in 60 s", "count", "higher"),
  measure("plank", "Plank hold", "s", "higher"),
  measure("height", "Height", "cm", "none"),
  measure("weight", "Weight", "kg", "none")
];

const DISCIPLINES = {
  // ---------- Sports ----------
  cricket: {
    label: "Cricket", group: "sport",
    fields: [
      select("role", "Role", ["Batter", "Bowler", "All-rounder", "Wicket-keeper"]),
      select("batting_hand", "Batting hand", HAND),
      select("bowling_style", "Bowling style", ["Fast", "Medium pace", "Off-spin", "Leg-spin", "Left-arm spin", "Does not bowl"]),
      text("jersey_no", "Jersey number", 6)
    ],
    levels: [], level_label: "Level",
    tests: [
      measure("sprint_20m", "20 m sprint", "s", "lower"),
      measure("throw_distance", "Throw distance", "m", "higher"),
      measure("catches_10", "Catches taken (out of 10)", "/10", "higher"),
      measure("bowling_target_12", "Bowling on target (out of 12)", "/12", "higher"),
      measure("batting_drill_10", "Middled shots (out of 10)", "/10", "higher")
    ],
    skills: [
      rating("grip_stance", "Grip and stance"), rating("footwork", "Footwork"), rating("timing", "Timing"),
      rating("bowling_action", "Bowling action"), rating("fielding", "Fielding")
    ]
  },
  football: {
    label: "Football", group: "sport",
    fields: [
      select("position", "Position", ["Goalkeeper", "Defender", "Midfielder", "Forward"]),
      select("preferred_foot", "Preferred foot", ["Right", "Left", "Both"]),
      text("jersey_no", "Jersey number", 6)
    ],
    levels: [], level_label: "Level",
    tests: [
      measure("slalom_dribble", "Slalom dribble", "s", "lower"),
      measure("juggling", "Juggling (touches)", "count", "higher"),
      measure("passing_10", "Passing accuracy (out of 10)", "/10", "higher"),
      measure("shooting_10", "Shots on target (out of 10)", "/10", "higher")
    ],
    skills: [
      rating("ball_control", "Ball control"), rating("passing", "Passing"), rating("shooting", "Shooting"),
      rating("positioning", "Positioning"), rating("teamwork", "Teamwork")
    ]
  },
  badminton: {
    label: "Badminton", group: "sport",
    fields: [select("playing_hand", "Playing hand", HAND), select("category", "Category", ["Singles", "Doubles", "Both"])],
    levels: [], level_label: "Level",
    tests: [
      measure("footwork_ladder", "Footwork ladder", "s", "lower"),
      measure("serve_10", "Serve accuracy (out of 10)", "/10", "higher"),
      measure("smash_10", "Smash accuracy (out of 10)", "/10", "higher"),
      measure("skipping_60s", "Skipping in 60 s", "count", "higher")
    ],
    skills: [
      rating("grip", "Grip"), rating("footwork", "Footwork"), rating("serve", "Serve"),
      rating("net_play", "Net play"), rating("smash", "Smash"), rating("defence", "Defence")
    ]
  },
  swimming: {
    label: "Swimming", group: "sport",
    fields: [select("main_stroke", "Main stroke", ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Medley"])],
    levels: ["Water confidence", "Beginner", "Intermediate", "Advanced", "Competitive"], level_label: "Level",
    tests: [
      measure("free_25m", "25 m freestyle", "s", "lower"),
      measure("free_50m", "50 m freestyle", "s", "lower"),
      measure("back_25m", "25 m backstroke", "s", "lower"),
      measure("breast_25m", "25 m breaststroke", "s", "lower"),
      measure("fly_25m", "25 m butterfly", "s", "lower"),
      measure("breath_hold", "Breath hold", "s", "higher")
    ],
    skills: [
      rating("breathing", "Breathing"), rating("body_position", "Body position"), rating("kick", "Kick"),
      rating("arm_stroke", "Arm stroke"), rating("turns", "Turns and starts")
    ]
  },
  athletics: {
    label: "Athletics", group: "sport",
    fields: [select("event", "Main event", ["Sprints", "Middle distance", "Long distance", "Hurdles", "Long jump", "High jump", "Throws"])],
    levels: [], level_label: "Level",
    tests: [
      measure("run_200m", "200 m", "s", "lower"),
      measure("run_400m", "400 m", "s", "lower"),
      measure("run_800m", "800 m", "s", "lower"),
      measure("long_jump", "Long jump", "m", "higher"),
      measure("shot_put", "Shot put", "m", "higher")
    ],
    skills: [rating("start", "Start"), rating("technique", "Technique"), rating("endurance", "Endurance")]
  },
  tennis: {
    label: "Tennis", group: "sport",
    fields: [select("playing_hand", "Playing hand", HAND), select("backhand", "Backhand", ["One-handed", "Two-handed"])],
    levels: [], level_label: "Level",
    tests: [
      measure("serve_10", "Serve accuracy (out of 10)", "/10", "higher"),
      measure("rally_count", "Longest rally", "count", "higher"),
      measure("footwork_ladder", "Footwork ladder", "s", "lower")
    ],
    skills: [rating("forehand", "Forehand"), rating("backhand", "Backhand"), rating("serve", "Serve"), rating("volley", "Volley"), rating("movement", "Movement")]
  },
  basketball: {
    label: "Basketball", group: "sport",
    fields: [select("position", "Position", ["Point guard", "Shooting guard", "Small forward", "Power forward", "Center"]), text("jersey_no", "Jersey number", 6)],
    levels: [], level_label: "Level",
    tests: [
      measure("free_throws_10", "Free throws (out of 10)", "/10", "higher"),
      measure("layups_30s", "Layups in 30 s", "count", "higher"),
      measure("dribble_course", "Dribble course", "s", "lower")
    ],
    skills: [rating("dribbling", "Dribbling"), rating("shooting", "Shooting"), rating("passing", "Passing"), rating("defence", "Defence")]
  },
  table_tennis: {
    label: "Table tennis", group: "sport",
    fields: [select("playing_hand", "Playing hand", HAND), select("grip", "Grip", ["Shakehand", "Penhold"])],
    levels: [], level_label: "Level",
    tests: [measure("serve_10", "Serve accuracy (out of 10)", "/10", "higher"), measure("rally_count", "Longest rally", "count", "higher")],
    skills: [rating("forehand", "Forehand"), rating("backhand", "Backhand"), rating("serve", "Serve"), rating("spin", "Spin"), rating("footwork", "Footwork")]
  },
  skating: {
    label: "Skating", group: "sport",
    fields: [select("skate_type", "Skate type", ["Inline", "Quad"])],
    levels: LEVELS_3, level_label: "Level",
    tests: [measure("skate_100m", "100 m skate", "s", "lower"), measure("cone_slalom", "Cone slalom", "s", "lower")],
    skills: [rating("balance", "Balance"), rating("stride", "Stride"), rating("turns", "Turns"), rating("braking", "Braking")]
  },
  other_sport: {
    label: "Other sport", group: "sport",
    fields: [text("sport_name", "Sport name", 40)],
    levels: LEVELS_3, level_label: "Level",
    tests: [],
    skills: [rating("technique", "Technique"), rating("fitness", "Fitness"), rating("discipline", "Discipline")]
  },

  // ---------- Classes & Studios ----------
  dance: {
    label: "Dance", group: "studio",
    fields: [
      select("style", "Dance style", ["Classical", "Bharatnatyam", "Kathak", "Bollywood", "Hip-hop", "Contemporary", "Western", "Folk", "Other"]),
      text("costume_size", "Costume size", 10)
    ],
    levels: ["Beginner", "Intermediate", "Advanced", "Performer"], level_label: "Level",
    tests: [],
    skills: [rating("rhythm", "Rhythm"), rating("posture", "Posture"), rating("expression", "Expression"), rating("flexibility", "Flexibility"), rating("memory", "Choreography memory")]
  },
  music: {
    label: "Music", group: "studio",
    fields: [
      select("instrument", "Instrument", ["Vocals", "Harmonium", "Tabla", "Guitar", "Keyboard / Piano", "Violin", "Drums", "Flute", "Other"]),
      text("exam_board", "Exam board / grade (optional)", 40)
    ],
    levels: ["Beginner", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Diploma"], level_label: "Grade",
    tests: [],
    skills: [rating("pitch", "Sur / pitch"), rating("rhythm", "Taal / rhythm"), rating("theory", "Theory"), rating("technique", "Technique"), rating("performance", "Performance")]
  },
  art: {
    label: "Art & craft", group: "studio",
    fields: [select("medium", "Medium", ["Pencil / sketch", "Watercolour", "Acrylic / oil", "Digital", "Craft", "Calligraphy"])],
    levels: LEVELS_3, level_label: "Level",
    tests: [],
    skills: [rating("line_work", "Line work"), rating("colour", "Colour use"), rating("composition", "Composition"), rating("creativity", "Creativity"), rating("neatness", "Neatness")]
  },
  yoga: {
    label: "Yoga", group: "studio",
    fields: [
      select("focus", "Focus", ["Hatha", "Vinyasa", "Power yoga", "Prenatal", "Therapy", "Meditation"]),
      select("mode", "Mode", ["Offline", "Online", "Hybrid"])
    ],
    levels: LEVELS_3, level_label: "Level",
    tests: [
      measure("sit_reach", "Sit and reach", "cm", "higher"),
      measure("balance_hold", "Single-leg balance", "s", "higher"),
      measure("plank", "Plank hold", "s", "higher")
    ],
    skills: [rating("posture", "Posture"), rating("breathing", "Breathing"), rating("flexibility", "Flexibility"), rating("balance", "Balance")]
  },
  martial_arts: {
    label: "Martial arts", group: "studio",
    fields: [
      select("style", "Style", ["Karate", "Taekwondo", "Judo", "Kung Fu", "Boxing", "Muay Thai", "Kickboxing", "MMA", "BJJ", "Self-defence"]),
      text("uniform_size", "Uniform size", 10),
      select("parent_consent", "Parent consent", ["Yes", "No", "Not needed"])
    ],
    levels: ["White", "Yellow", "Orange", "Green", "Blue", "Purple", "Brown", "Red", "Black"], level_label: "Belt",
    tests: [measure("pushups_60s", "Push-ups in 60 s", "count", "higher"), measure("kicks_60s", "Kicks in 60 s", "count", "higher")],
    skills: [rating("form", "Kata / form"), rating("sparring", "Sparring"), rating("stance", "Stance"), rating("discipline", "Discipline"), rating("fitness", "Fitness")]
  },
  other_class: {
    label: "Other class", group: "studio",
    fields: [text("subject", "Subject / activity", 40)],
    levels: LEVELS_3, level_label: "Level",
    tests: [],
    skills: [rating("technique", "Technique"), rating("practice", "Practice"), rating("discipline", "Discipline")]
  }
};

// What the vendor calls things, per account type.
const VARIANTS = {
  academy: { key: "academy", label: "Academy", group: "sport", person: "Student", people: "Students", plans: "Fee plans", batch: "Batch", batches: "Batches" },
  studio: { key: "studio", label: "Studio", group: "studio", person: "Member", people: "Members", plans: "Packages", batch: "Class", batches: "Classes" }
};

const withKey = (prefix, t) => ({ ...t, key: `${prefix}.${t.key}` });

// Index of every built-in test (key -> definition) so results can be validated and labelled.
const TEST_INDEX = new Map();
COMMON_FITNESS.forEach((t) => TEST_INDEX.set(`common.${t.key}`, { ...withKey("common", t), discipline: null }));
Object.entries(DISCIPLINES).forEach(([dk, d]) => {
  [...d.tests, ...d.skills].forEach((t) => TEST_INDEX.set(`${dk}.${t.key}`, { ...withKey(dk, t), discipline: dk }));
});

const get = (key) => DISCIPLINES[key] || null;
const isAllowed = (group, key) => Boolean(DISCIPLINES[key]) && DISCIPLINES[key].group === group;
const findBuiltinTest = (key) => TEST_INDEX.get(key) || null;

// Safe-to-send config for one group ("sport" | "studio").
function publicConfig(group) {
  const disciplines = Object.entries(DISCIPLINES)
    .filter(([, d]) => d.group === group)
    .map(([key, d]) => ({
      key,
      label: d.label,
      fields: d.fields,
      levels: d.levels,
      level_label: d.level_label,
      tests: d.tests.map((t) => withKey(key, t)),
      skills: d.skills.map((t) => withKey(key, t))
    }));
  return {
    disciplines,
    common_tests: group === "sport" ? COMMON_FITNESS.map((t) => withKey("common", t)) : []
  };
}

module.exports = { DISCIPLINES, VARIANTS, get, isAllowed, findBuiltinTest, publicConfig };