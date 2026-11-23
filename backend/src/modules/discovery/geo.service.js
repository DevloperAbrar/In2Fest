// Works out where each vendor is, once, and stores it on the venue row (venues.latitude/longitude).
// The marketplace map then reads stored coordinates instead of guessing on every request.
//
// Order of attempts for one vendor:
//   1. Google Maps link (full link, or a short maps.app.goo.gl link that is followed to its end)
//   2. the vendor's address        (OpenStreetMap Nominatim)
//   3. the vendor's locality       (OpenStreetMap Nominatim)
//   4. the city centre             (cities table, else Nominatim)
//
// The columns are read and written with raw SQL on purpose: the Venue model is not touched,
// so a slow or failed migration can never break the other venue queries.
const axios = require("axios");
const crypto = require("crypto");
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const { City } = require("../../database/models");

const USER_AGENT = process.env.GEOCODER_USER_AGENT || "In2Fest/1.0 (vendor map locations)";
const SHORT_HOST = /^(maps\.app\.goo\.gl|goo\.gl)$/i;
const RECHECK_MS = 3 * 24 * 60 * 60 * 1000;

// India only: anything outside is a wrong match.
const inIndia = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;

function extractCoordsFromLink(link = "") {
  const pin = link.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (pin) return [parseFloat(pin[1]), parseFloat(pin[2])];
  const at = link.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (at) return [parseFloat(at[1]), parseFloat(at[2])];
  const q = link.match(/[?&](?:q|query|ll)=(-?\d+\.?\d+),\s*(-?\d+\.?\d+)/);
  if (q) return [parseFloat(q[1]), parseFloat(q[2])];
  return null;
}

// Follows a short Google link (maps.app.goo.gl) to the full link, then reads the coordinates.
// Only Google's own short-link hosts are ever fetched.
async function coordsFromShortLink(link) {
  let host;
  try { host = new URL(link).hostname; } catch { return null; }
  if (!SHORT_HOST.test(host)) return null;

  const res = await axios.get(link, {
    maxRedirects: 6,
    timeout: 7000,
    responseType: "text",
    maxContentLength: 3 * 1024 * 1024,
    validateStatus: (s) => s < 500,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; In2FestBot/1.0)", "Accept-Language": "en-IN" }
  });
  const finalUrl = (res.request && res.request.res && res.request.res.responseUrl) || "";
  const candidates = [finalUrl];
  const cont = finalUrl.match(/[?&]continue=([^&]+)/); // Google consent page wraps the real link
  if (cont) { try { candidates.push(decodeURIComponent(cont[1])); } catch { /* ignore */ } }
  for (const c of candidates) {
    const p = extractCoordsFromLink(c);
    if (p) return p;
  }
  return null;
}

// Nominatim allows 1 request per second, so every lookup waits its turn in one queue.
let geocodeChain = Promise.resolve();
let lastGeocodeAt = 0;
async function runGeocode(query) {
  const wait = lastGeocodeAt + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocodeAt = Date.now();
  const res = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: { q: query, format: "jsonv2", limit: 1, countrycodes: "in" },
    timeout: 8000,
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" }
  });
  const hit = Array.isArray(res.data) ? res.data[0] : null;
  if (!hit) return null;
  const lat = parseFloat(hit.lat);
  const lng = parseFloat(hit.lon);
  return inIndia(lat, lng) ? [lat, lng] : null;
}
function geocode(query) {
  const next = geocodeChain.then(() => runGeocode(query));
  geocodeChain = next.catch(() => {});
  return next;
}

async function resolveGeo(v) {
  const link = String(v.google_maps_link || "").trim();
  if (link) {
    let c = extractCoordsFromLink(link);
    if (!c) c = await coordsFromShortLink(link).catch(() => null);
    if (c && inIndia(c[0], c[1])) return { lat: c[0], lng: c[1], source: "link" };
  }

  const city = String(v.city || "").trim();
  const tries = [];
  if (v.address && city) tries.push([`${String(v.address).replace(/\s+/g, " ").trim()}, ${city}, India`, "address"]);
  if (v.primary_locality && city) tries.push([`${v.primary_locality}, ${city}, India`, "locality"]);
  for (const [q, source] of tries) {
    const c = await geocode(q).catch(() => null);
    if (c) return { lat: c[0], lng: c[1], source };
  }

  if (city) {
    const row = await City.findOne({ where: { name: city }, attributes: ["latitude", "longitude"] }).catch(() => null);
    const la = row ? parseFloat(row.latitude) : NaN;
    const lo = row ? parseFloat(row.longitude) : NaN;
    if (inIndia(la, lo)) return { lat: la, lng: lo, source: "city" };
    const c = await geocode(`${city}, India`).catch(() => null);
    if (c) return { lat: c[0], lng: c[1], source: "city" };
  }
  return null;
}

// Changes whenever the link, address, locality or city changes, so a moved vendor is looked up again.
function keyFor(v) {
  const raw = [v.google_maps_link, v.address, v.primary_locality, v.city].map((s) => String(s || "").trim().toLowerCase()).join("|");
  return crypto.createHash("sha1").update(raw).digest("hex").slice(0, 40);
}

const COLUMNS = "id, hall_name, address, city, primary_locality, google_maps_link, latitude, longitude, geo_key, geo_checked_at";

async function processRow(row) {
  const key = keyFor(row);
  const same = row.geo_key === key;
  if (same && row.latitude != null) return false;
  if (same && row.geo_checked_at && Date.now() - new Date(row.geo_checked_at).getTime() < RECHECK_MS) return false;

  const g = await resolveGeo(row);
  await sequelize.query(
    `UPDATE venues SET latitude = :lat, longitude = :lng, geo_source = :src, geo_key = :key, geo_checked_at = NOW() WHERE id = :id`,
    { replacements: { lat: g ? g.lat : null, lng: g ? g.lng : null, src: g ? g.source : null, key, id: row.id } }
  );
  return Boolean(g);
}

let running = false;

// Fills in vendors that have no stored location yet. Safe to call often: one run at a time.
async function backfillMissing(limit = 25, onlyIds = null) {
  if (running) return 0;
  running = true;
  let done = 0;
  try {
    const byIds = Array.isArray(onlyIds) && onlyIds.length;
    const rows = await sequelize.query(
      `SELECT ${COLUMNS} FROM venues
        WHERE is_active = true AND latitude IS NULL
          AND (geo_checked_at IS NULL OR geo_checked_at < NOW() - INTERVAL '3 days')
          ${byIds ? "AND id IN (:ids)" : ""}
        ORDER BY geo_checked_at ASC NULLS FIRST
        LIMIT :limit`,
      { replacements: { limit, ids: byIds ? onlyIds : [null] }, type: QueryTypes.SELECT }
    );
    for (const row of rows) {
      try { if (await processRow(row)) done += 1; } catch (e) { console.error("[GEO] venue", row.id, e.message); }
    }
  } catch (e) {
    console.error("[GEO] backfill failed:", e.message);
  } finally {
    running = false;
  }
  return done;
}

// Called after a vendor saves a new link, address, locality or city.
async function refreshVenue(id) {
  const rows = await sequelize.query(`SELECT ${COLUMNS} FROM venues WHERE id = :id`, { replacements: { id }, type: QueryTypes.SELECT });
  if (rows[0]) await processRow(rows[0]);
}

// Stored coordinates for a list of venue ids: Map(id -> { lat, lng, source }).
async function loadGeo(ids) {
  const out = new Map();
  if (!ids || !ids.length) return out;
  try {
    const rows = await sequelize.query(
      `SELECT id, latitude, longitude, geo_source FROM venues WHERE id IN (:ids) AND latitude IS NOT NULL`,
      { replacements: { ids }, type: QueryTypes.SELECT }
    );
    rows.forEach((r) => out.set(r.id, { lat: parseFloat(r.latitude), lng: parseFloat(r.longitude), source: r.geo_source }));
  } catch (e) {
    // Migration not finished yet: the map falls back to the old coordinates.
  }
  return out;
}

// Same city = same pin. Spread such pins a little (about 0.4 to 1.5 km) so they do not hide each other.
function jitter(id, lat, lng) {
  const h = crypto.createHash("md5").update(String(id)).digest();
  const angle = (h[0] / 255) * Math.PI * 2;
  const radius = 0.004 + (h[1] / 255) * 0.01;
  return [lat + Math.sin(angle) * radius, lng + Math.cos(angle) * radius];
}

module.exports = { extractCoordsFromLink, backfillMissing, refreshVenue, loadGeo, jitter };