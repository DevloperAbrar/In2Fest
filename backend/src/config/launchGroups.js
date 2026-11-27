// Single source of truth for "which categories are live on the marketplace".
//
// launch_status:
//   live   - shown on home, menu, categories page, filters, counters and sitemap
//   hidden - removed from all of the above, but existing vendors' pages and links keep working
//   soon   - not listed (the categories page shows one general "more categories soon" line)
//
// Super Admin sets launch_status / launch_group per category. When a category has no value yet,
// DEFAULT_LIVE below decides, and anything not listed there is hidden. Never rename a slug.
const GROUPS = {
    gym: { title: "Gym & Fitness" },
    sports: { title: "Sports Academy" },
    studios: { title: "Classes & Studios" },
    library: { title: "Library & Study Room" }
  };
  const GROUP_KEYS = Object.keys(GROUPS);
  const STATUSES = ["live", "hidden", "soon"];
  
  const DEFAULT_LIVE = {
    "gym-fitness": "gym",
    academy: "sports",
    studio: "studios",
    "yoga-studio": "studios",
    "yoga-center": "studios",
    "study-library": "library"
  };
  
  function resolveLaunch(cat) {
    const status = STATUSES.includes(cat.launch_status)
      ? cat.launch_status
      : (DEFAULT_LIVE[cat.slug] ? "live" : "hidden");
    const group = GROUP_KEYS.includes(cat.launch_group) ? cat.launch_group : (DEFAULT_LIVE[cat.slug] || null);
    // A live category must belong to a group, otherwise it has nowhere to appear.
    return { launch_status: status === "live" && !group ? "hidden" : status, launch_group: group };
  }
  
  // Slugs of live, active categories. Cached for a minute so the home page stays fast.
  let cache = { at: 0, slugs: null };
  async function getLiveSlugs() {
    if (cache.slugs && Date.now() - cache.at < 60 * 1000) return cache.slugs;
    const { Category } = require("../database/models");
    const rows = await Category.findAll({
      where: { active: true },
      attributes: ["slug", "launch_status", "launch_group"],
      raw: true
    });
    const slugs = rows.filter((r) => resolveLaunch(r).launch_status === "live").map((r) => r.slug);
    cache = { at: Date.now(), slugs };
    return slugs;
  }
  
  module.exports = { GROUPS, GROUP_KEYS, STATUSES, resolveLaunch, getLiveSlugs };