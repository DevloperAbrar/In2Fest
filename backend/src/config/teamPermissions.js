const { getBusinessProfile } = require("./businessTypes");

// Sub-features that only make sense together with a parent module.
const PARENT_MODULE = { gym_pro: "gym", food_pro: "food" };

// Every key a team member can be given.
const ASSIGNABLE_KEYS = [
  "website_builder",
  "marketplace_profile",
  "reviews",
  "slots",
  "inquiries",
  "bookings",
  "clients",
  "billing",
  "gym",
  "food",
  "library"
];

/**
 * Task-level scopes inside a module. The owner can give a team member only some of them,
 * e.g. gym -> ["attendance"].
 *
 * rules: [pathPrefix, scopes, method?, exact?]
 *  - scopes = array  -> member needs ANY of these scopes
 *  - scopes = null   -> open to every scoped member (harmless shared endpoints)
 *  - method / exact  -> optional, make a rule apply to one HTTP method / the exact path only
 * First matching rule wins, so specific rules come before general ones.
 * A path with no rule is DENIED for scoped members. "reports" covers revenue / profit screens.
 */
const SCOPES = {
  gym: {
    options: [
      { key: "members", label: "Members" },
      { key: "attendance", label: "Attendance" },
      { key: "payments", label: "Fee payments" },
      { key: "stock", label: "Stock & products" },
      { key: "sales", label: "Store sales (POS)" },
      { key: "workouts", label: "Workout plans" },
      { key: "leads", label: "Leads" },
      { key: "messages", label: "Messages" },
      { key: "reports", label: "Reports & revenue" }
    ],
    rules: [
      ["/dashboard", ["reports"]],
      ["/settings", null],
      ["/logo", null],
      // member list = lookup used by attendance, sales, workouts, leads and messages
      ["/members", ["members", "attendance", "sales", "workouts", "leads", "messages"], "GET", true],
      ["/members", ["members"]],
      ["/plans", ["members"]],
      ["/shifts", ["members"]],
      ["/card-settings", ["members"]],
      ["/card-preview", ["members"]],
      ["/attendance", ["attendance"]],
      ["/payments", ["payments"]],
      ["/store/overview", ["stock", "sales", "reports"]],
      ["/store/sales", ["sales"]],
      ["/store/pos", ["sales"]],
      ["/store/products", ["stock", "sales"], "GET"],
      ["/store/categories", ["stock", "sales"], "GET"],
      ["/store/settings", ["stock", "sales"], "GET"],
      ["/store", ["stock"]],
      ["/exercises", ["workouts"]],
      ["/workout-plans", ["workouts"]],
      ["/leads", ["leads"]],
      ["/messages", ["messages"]]
    ]
  },
  library: {
    options: [
      { key: "students", label: "Students & seats" },
      { key: "attendance", label: "Attendance" },
      { key: "payments", label: "Fee payments" },
      { key: "books", label: "Books & lending" },
      { key: "reports", label: "Reports & revenue" }
    ],
    rules: [
      ["/dashboard", ["reports"]],
      ["/settings", null],
      ["/halls", ["students", "attendance"], "GET"],
      ["/shifts", ["students", "attendance"], "GET"],
      ["/students", ["students", "attendance", "payments", "books"], "GET", true],
      ["/halls", ["students"]],
      ["/shifts", ["students"]],
      ["/students", ["students"]],
      ["/reminders", ["students"]],
      ["/attendance", ["attendance"]],
      ["/payments", ["payments"]],
      ["/books", ["books"]],
      ["/loans", ["books"]]
    ]
  }
};

const FEATURE_LABELS = { gym_pro: "Gym Pro", food_pro: "Restaurant Pro" };

function scopeKeysFor(moduleKey) {
  return SCOPES[moduleKey] ? SCOPES[moduleKey].options.map((o) => o.key) : [];
}

/**
 * Permission keys that make sense for this venue's business type.
 * A gym never gets "food", a restaurant never gets "gym" or "slots", and so on.
 */
function assignableKeysForVenue(venue) {
  const profile = getBusinessProfile(venue.business_category, venue.secondary_categories || []);
  const modules = new Set(profile.modules || []);
  return ASSIGNABLE_KEYS.filter((key) => modules.has(PARENT_MODULE[key] || key));
}

// Can a team member holding `list` scopes call this method + path inside the module?
function isScopeAllowed(moduleKey, method, path, list) {
  const def = SCOPES[moduleKey];
  if (!def) return true;
  const p = String(path || "/").replace(/\/+$/, "") || "/";
  const m = String(method || "GET").toUpperCase();

  for (const [prefix, scopes, ruleMethod, exact] of def.rules) {
    const matches = exact ? p === prefix : p === prefix || p.startsWith(`${prefix}/`);
    if (!matches) continue;
    if (ruleMethod && ruleMethod !== m) continue;
    if (scopes === null) return true;
    return scopes.some((s) => list.includes(s));
  }
  return false;
}

// True when this team member was limited to specific tasks and none of them is "reports".
function isRestrictedTeamMember(user) {
  if (!user || user.role !== "team_member") return false;
  const scopes = user.permissions && user.permissions.scopes;
  if (!scopes || typeof scopes !== "object") return false;
  const lists = Object.values(scopes).filter(Array.isArray);
  if (!lists.length) return false;
  return !lists.some((list) => list.includes("reports"));
}

module.exports = {
  ASSIGNABLE_KEYS,
  SCOPES,
  FEATURE_LABELS,
  scopeKeysFor,
  isScopeAllowed,
  isRestrictedTeamMember,
  assignableKeysForVenue
};