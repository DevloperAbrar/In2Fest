// Task-level limits for team members (see backend/src/config/teamPermissions.js).
// Owners and old team members (no scope list) always get full access.

const isMember = (user) => user?.role === "team_member" && !user?.isDemo;

// Scope list the member was limited to for a module, or null = full access.
export function scopeList(user, moduleKey) {
  if (!isMember(user)) return null;
  const list = user.permissions?.scopes?.[moduleKey];
  return Array.isArray(list) ? list : null;
}

// needed = one scope key or an array (any of them is enough).
export function hasScope(user, moduleKey, needed) {
  const list = scopeList(user, moduleKey);
  if (!list) return true;
  const wanted = Array.isArray(needed) ? needed : [needed];
  return wanted.some((k) => list.includes(k));
}

// Limited to specific tasks and "Reports & revenue" is not one of them.
export function isRestrictedMember(user) {
  if (!isMember(user)) return false;
  const scopes = user.permissions?.scopes;
  if (!scopes || typeof scopes !== "object") return false;
  const lists = Object.values(scopes).filter(Array.isArray);
  return lists.length > 0 && !lists.some((l) => l.includes("reports"));
}

export const GYM_TAB_SCOPES = {
  "/dashboard/gym": ["reports"],
  "/dashboard/gym/members": ["members"],
  "/dashboard/gym/plans": ["members"],
  "/dashboard/gym/shifts": ["members"],
  "/dashboard/gym/attendance": ["attendance"],
  "/dashboard/gym/workouts": ["workouts"],
  "/dashboard/gym/leads": ["leads"],
  "/dashboard/gym/messages": ["messages"],
  "/dashboard/gym/store": ["stock", "sales", "reports"]
};

export const LIB_TAB_SCOPES = {
  "/dashboard/library": ["reports"],
  "/dashboard/library/students": ["students"],
  "/dashboard/library/halls": ["students"],
  "/dashboard/library/shifts": ["students"],
  "/dashboard/library/attendance": ["attendance"],
  "/dashboard/library/payments": ["payments"],
  "/dashboard/library/books": ["books"],
  "/dashboard/library/reminders": ["students"]
};

const MODULE_TABS = { gym: GYM_TAB_SCOPES, library: LIB_TAB_SCOPES };

// First page of a module this member may open (null if not limited / nothing allowed).
export function firstAllowedPath(user, moduleKey) {
  const list = scopeList(user, moduleKey);
  if (!list) return null;
  const tabs = MODULE_TABS[moduleKey] || {};
  const hit = Object.entries(tabs).find(([, needed]) => needed.some((k) => list.includes(k)));
  return hit ? hit[0] : null;
}

// Where a limited member should land instead of the main dashboard.
export function restrictedHome(user) {
  if (!isRestrictedMember(user)) return null;
  for (const moduleKey of Object.keys(MODULE_TABS)) {
    if (user.permissions?.[moduleKey] === true) {
      const path = firstAllowedPath(user, moduleKey);
      if (path) return path;
    }
  }
  return null;
}