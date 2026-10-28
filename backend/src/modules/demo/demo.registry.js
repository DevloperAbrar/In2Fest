const { QueryTypes } = require("sequelize");
const { getSequelize } = require("../../utils/db");

// Tiny in-memory view of demo_accounts so normal requests never pay a DB cost.
// If the table is missing or the DB hiccups, it behaves as "no demos" - real customers are never affected.
const TTL_MS = 30 * 1000;
let cache = new Map();
let loadedAt = 0;
let loading = null;
const lastTouch = new Map();

function refresh() {
  if (loading) return loading;
  loading = (async () => {
    try {
      const rows = await getSequelize().query(
        "SELECT venue_id, status, expires_at FROM demo_accounts",
        { type: QueryTypes.SELECT }
      );
      const next = new Map();
      rows.forEach((r) => next.set(String(r.venue_id), { status: r.status, expires_at: r.expires_at }));
      cache = next;
    } catch (e) {
      /* keep the old cache */
    } finally {
      loadedAt = Date.now();
      loading = null;
    }
  })();
  return loading;
}

async function get(venueId) {
  if (!venueId) return null;
  if (Date.now() - loadedAt > TTL_MS) await refresh();
  return cache.get(String(venueId)) || null;
}

const isLive = (info) =>
  !!info && info.status === "active" && new Date(info.expires_at).getTime() > Date.now();

const set = (venueId, info) => cache.set(String(venueId), info);
const remove = (venueId) => cache.delete(String(venueId));

// "Last active" for the admin page, written at most once a minute per demo.
function touch(venueId) {
  const now = Date.now();
  if (now - (lastTouch.get(venueId) || 0) < 60 * 1000) return;
  lastTouch.set(venueId, now);
  getSequelize()
    .query("UPDATE demo_accounts SET last_active_at = now() WHERE venue_id = :v", { replacements: { v: venueId } })
    .catch(() => {});
}

function recordLogin(venueId) {
  getSequelize()
    .query(
      "UPDATE demo_accounts SET last_login_at = now(), last_active_at = now(), login_count = login_count + 1 WHERE venue_id = :v",
      { replacements: { v: venueId } }
    )
    .catch(() => {});
}

module.exports = { get, isLive, set, remove, touch, recordLogin, warm: refresh };