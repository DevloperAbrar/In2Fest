/**
 * SEO for vendor websites (https://<subdomain>.in2fest.com).
 *
 * Why this exists: every vendor site is the same React build, and index.html carries
 * <meta name="robots" content="noindex"> because it is also the dashboard. nginx now sends
 * every non-file request on *.in2fest.com here. We read the built index.html and, per host:
 *   - vendor website  -> remove noindex, add title / description / canonical / OG / JSON-LD
 *   - app.in2fest.com and every other page (login, dashboard, verify, order) -> noindex
 *   - unknown / not-live vendor -> real 404 status (still serves the SPA shell)
 * It also serves /robots.txt, /sitemap.xml per host and one cross-host sitemap of all live
 * vendor websites at /api/sitemap-websites.xml.
 *
 * Nothing here changes the React app, the API or the database.
 */
const fs = require("fs");
const path = require("path");
const express = require("express");
const { Venue, Subscription, Plan } = require("../../database/models");
const env = require("../../config/env");
const { slugify } = require("../../utils/slugify");

const BASE = env.baseDomain || "in2fest.com";
const BASE_PARTS = BASE.split(".").length;
const RESERVED = new Set(["www", "app", "api", "admin"]);

// Path of the built vendor frontend. Override with FRONTEND_DIST in .env if the layout changes.
const INDEX_PATH =
  process.env.FRONTEND_DIST
    ? path.join(process.env.FRONTEND_DIST, "index.html")
    : path.resolve(__dirname, "../../../../frontend/dist/index.html");

const PAGE_TTL = 5 * 60 * 1000; // per-vendor rendered page
const MISS_TTL = 60 * 1000; // unknown vendors (stops random-subdomain floods hitting the DB)
const SITEMAP_TTL = 60 * 60 * 1000;
const MAX_CACHE = 2000;

const router = express.Router(); // mounted at /
const apiRouter = express.Router(); // mounted at /api

/* ------------------------------ helpers ------------------------------ */

const escHtml = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const escXml = (s = "") => escHtml(s).replace(/'/g, "&apos;");

// JSON for a <script type="application/ld+json"> block: "<" must never appear raw.
const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

const titleCase = (slug = "") => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const clip = (text = "", max) => {
  const t = String(text).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
};

/** "five-s-gym.in2fest.com" -> { kind: "vendor", sub: "five-s-gym" }. Anything else -> null. */
function classifyHost(hostname = "") {
  const host = String(hostname).toLowerCase();
  if (!host.endsWith(`.${BASE}`)) return null;
  const parts = host.split(".");
  if (parts.length <= BASE_PARTS) return null;
  const sub = parts[0];
  if (parts.length === BASE_PARTS + 1 && !RESERVED.has(sub)) return { kind: "vendor", sub, host };
  return { kind: "app", sub, host }; // app., www., api., admin. and deeper hosts: never indexable
}

function absoluteUrl(url, host) {
  if (!url || typeof url !== "string") return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${host}${url.startsWith("/") ? "" : "/"}${url}`;
}

function socialLinks(v) {
  const out = [];
  const ig = (v.instagram_handle || "").trim().replace(/^@/, "");
  if (ig) out.push(/^https?:\/\//i.test(ig) ? ig : `https://www.instagram.com/${ig}`);
  const yt = (v.youtube_channel_link || "").trim();
  if (/^https?:\/\//i.test(yt)) out.push(yt);
  if (v.marketplace_listed && v.marketplace_suspended === false && v.city && v.business_category) {
    out.push(`https://${BASE}/${slugify(v.city)}/${v.business_category}/${v.subdomain}`);
  }
  return out;
}

function schemaType(categorySlug = "") {
  if (categorySlug.includes("gym") || categorySlug.includes("fitness")) return "ExerciseGym";
  if (categorySlug.includes("restaurant") || categorySlug.includes("food")) return "Restaurant";
  return "LocalBusiness";
}

/** Everything that goes into <head> for an indexable vendor home page. */
function buildVendorMeta(v, host) {
  const url = `https://${host}/`;
  const catName = titleCase(v.business_category || "");
  const where = v.primary_locality && v.city ? `${v.primary_locality}, ${v.city}` : v.city || "";

  const title = clip(
    [v.hall_name, [catName, where && `in ${where}`].filter(Boolean).join(" ")].filter(Boolean).join(" | "),
    65
  );

  const description = clip(
    v.hero_subheading ||
      v.specialty_tagline ||
      v.about_text ||
      v.long_description ||
      `${v.hall_name} is a ${catName.toLowerCase() || "business"}${where ? ` in ${where}` : ""}. View services, photos, contact details and enquire online.`,
    158
  );

  const gallery = Array.isArray(v.gallery) ? v.gallery : [];
  const firstGallery = gallery.map((g) => (typeof g === "string" ? g : g && (g.url || g.image_url))).find(Boolean);
  const image = absoluteUrl(v.hero_image_url || firstGallery || v.logo_url, host);

  const ld = {
    "@context": "https://schema.org",
    "@type": schemaType(v.business_category),
    "@id": `${url}#business`,
    name: v.hall_name,
    url,
    description,
    ...(image && { image }),
    ...(v.phone && { telephone: v.phone }),
    ...(v.year_established && { foundingDate: String(v.year_established) }),
    address: {
      "@type": "PostalAddress",
      ...(v.address && { streetAddress: clip(v.address, 200) }),
      ...(v.city && { addressLocality: v.city }),
      ...(v.full_pincode && { postalCode: v.full_pincode }),
      addressCountry: "IN"
    },
    ...(v.google_maps_link && /^https?:\/\//i.test(v.google_maps_link) && { hasMap: v.google_maps_link })
  };
  const same = socialLinks(v);
  if (same.length) ld.sameAs = same;

  const head = [
    `<title>${escHtml(title)}</title>`,
    `<meta name="description" content="${escHtml(description)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<link rel="canonical" href="${escHtml(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escHtml(v.hall_name)}" />`,
    `<meta property="og:title" content="${escHtml(title)}" />`,
    `<meta property="og:description" content="${escHtml(description)}" />`,
    `<meta property="og:url" content="${escHtml(url)}" />`,
    image && `<meta property="og:image" content="${escHtml(image)}" />`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escHtml(title)}" />`,
    `<meta name="twitter:description" content="${escHtml(description)}" />`,
    `<script type="application/ld+json">${jsonLd(ld)}</script>`
  ]
    .filter(Boolean)
    .join("\n    ");

  // Plain text for crawlers that do not run JS. Browsers with JS never show this.
  const noscript = `<noscript><h1>${escHtml(v.hall_name)}</h1><p>${escHtml(description)}</p>${
    v.address ? `<p>${escHtml(clip(v.address, 200))}</p>` : ""
  }${v.phone ? `<p>${escHtml(v.phone)}</p>` : ""}</noscript>`;

  return { head, noscript };
}

/** Takes the built index.html and applies the SEO decision for this request. */
function renderHtml(template, { indexable, head, noscript }) {
  let html = template
    .replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, "")
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "");

  const inject = indexable
    ? head
    : `<title>In2Fest</title>\n    <meta name="robots" content="noindex, nofollow" />`;
  html = html.replace("</head>", `    ${inject}\n  </head>`);
  if (indexable && noscript) html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    ${noscript}`);
  return html;
}

/* --------------------------- template + caches --------------------------- */

let tpl = { html: null, mtime: 0, checkedAt: 0 };
function readTemplate() {
  const now = Date.now();
  if (tpl.html && now - tpl.checkedAt < 30 * 1000) return tpl.html;
  const stat = fs.statSync(INDEX_PATH);
  if (!tpl.html || stat.mtimeMs !== tpl.mtime) {
    tpl = { html: fs.readFileSync(INDEX_PATH, "utf8"), mtime: stat.mtimeMs, checkedAt: now };
  } else {
    tpl.checkedAt = now;
  }
  return tpl.html;
}

const pageCache = new Map(); // sub -> { until, venue }
function cacheSet(map, key, value) {
  if (map.size >= MAX_CACHE) map.delete(map.keys().next().value);
  map.set(key, value);
}

async function venueHasWebsiteFeature(venueId) {
  const sub = await Subscription.findOne({
    where: { venue_id: venueId },
    include: [{ model: Plan, as: "plan" }]
  });
  const features = sub && sub.plan && sub.plan.features;
  return Array.isArray(features) && features.includes("website_builder");
}

/** Same rules as the public API: live, active, website on, and the plan includes a website. */
async function lookupLiveVendor(sub) {
  const hit = pageCache.get(sub);
  if (hit && hit.until > Date.now()) return hit.venue;

  let venue = null;
  const row = await Venue.findOne({ where: { subdomain: sub, is_active: true, website_suspended: false } });
  if (row && row.is_live && (await venueHasWebsiteFeature(row.id))) venue = row;

  cacheSet(pageCache, sub, { until: Date.now() + (venue ? PAGE_TTL : MISS_TTL), venue });
  return venue;
}

/* -------------------------------- routes -------------------------------- */

function send(res, status, type, body, cache) {
  // Helmet's CSP / COOP are for the JSON API. On the SPA shell they would block Cashfree,
  // Google sign-in and fonts, so they are dropped here (nginx never added them before).
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("Cross-Origin-Opener-Policy");
  res.removeHeader("Cross-Origin-Embedder-Policy");
  res.status(status).set({ "Content-Type": type, "Cache-Control": cache }).send(body);
}

router.get("/robots.txt", (req, res, next) => {
  const h = classifyHost(req.hostname);
  if (!h) return next();
  const body =
    h.kind === "vendor"
      ? [
          "User-agent: *",
          "Allow: /",
          "Disallow: /dashboard/",
          "Disallow: /admin/",
          "Disallow: /login",
          "Disallow: /team-login",
          "Disallow: /visitor-login",
          "Disallow: /auth/",
          "Disallow: /verify/",
          "Disallow: /order/",
          "Disallow: /r/",
          "",
          `Sitemap: https://${h.host}/sitemap.xml`,
          ""
        ].join("\n")
      : "User-agent: *\nDisallow: /\n";
  send(res, 200, "text/plain; charset=utf-8", body, "public, max-age=300");
});

router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const h = classifyHost(req.hostname);
    if (!h) return next();
    const venue = h.kind === "vendor" ? await lookupLiveVendor(h.sub) : null;
    if (!venue) return send(res, 404, "text/plain; charset=utf-8", "Not found", "public, max-age=60");
    const last = venue.updatedAt ? new Date(venue.updatedAt).toISOString().split("T")[0] : null;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escXml(`https://${h.host}/`)}</loc>${last ? `\n    <lastmod>${last}</lastmod>` : ""}
  </url>
</urlset>`;
    send(res, 200, "application/xml; charset=utf-8", xml, "public, max-age=300");
  } catch (err) {
    next(err);
  }
});

// Cross-host sitemap listing every live vendor website. Served on the apex under /api so it
// works through the existing nginx /api/ proxy. Submit https://in2fest.com/api/sitemap-websites.xml.
let siteCache = { xml: null, builtAt: 0 };
apiRouter.get("/sitemap-websites.xml", async (req, res, next) => {
  try {
    const now = Date.now();
    if (!siteCache.xml || now - siteCache.builtAt > SITEMAP_TTL) {
      const [venues, subs] = await Promise.all([
        Venue.findAll({
          where: { is_active: true, is_live: true, website_suspended: false },
          attributes: ["id", "subdomain", "updatedAt"]
        }),
        Subscription.findAll({ attributes: ["venue_id"], include: [{ model: Plan, as: "plan", attributes: ["features"] }] })
      ]);
      const allowed = new Set(
        subs
          .filter((s) => Array.isArray(s.plan && s.plan.features) && s.plan.features.includes("website_builder"))
          .map((s) => s.venue_id)
      );
      const urls = venues
        .filter((v) => v.subdomain && !RESERVED.has(v.subdomain) && allowed.has(v.id))
        .map((v) => {
          const d = v.updatedAt ? new Date(v.updatedAt).toISOString().split("T")[0] : null;
          return `  <url>\n    <loc>${escXml(`https://${v.subdomain}.${BASE}/`)}</loc>${d ? `\n    <lastmod>${d}</lastmod>` : ""}\n  </url>`;
        });
      siteCache = {
        builtAt: now,
        xml: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`
      };
    }
    send(res, 200, "application/xml; charset=utf-8", siteCache.xml, "public, max-age=3600");
  } catch (err) {
    next(err);
  }
});

// The SPA shell for every other page on app.* and vendor hosts (nginx @seo fallback).
router.use(async (req, res, next) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (/^\/(api|uploads|health|assets|icons)(\/|$)/.test(req.path)) return next();
    const h = classifyHost(req.hostname);
    if (!h) return next();

    let template;
    try {
      template = readTemplate();
    } catch (e) {
      console.error("[SEO] cannot read", INDEX_PATH, e.message);
      return next(e); // nginx falls back to the static index.html on 5xx
    }

    // Only the vendor home page can be indexed. Everything else is a utility page.
    if (h.kind === "vendor" && req.path === "/") {
      const venue = await lookupLiveVendor(h.sub);
      if (venue) {
        const { head, noscript } = buildVendorMeta(venue, h.host);
        return send(res, 200, "text/html; charset=utf-8", renderHtml(template, { indexable: true, head, noscript }), "no-cache");
      }
      // Not found / not live / no website plan: real 404, so Google drops it. The SPA shows its own message.
      return send(res, 404, "text/html; charset=utf-8", renderHtml(template, { indexable: false }), "no-cache");
    }
    return send(res, 200, "text/html; charset=utf-8", renderHtml(template, { indexable: false }), "no-cache");
  } catch (err) {
    next(err);
  }
});

module.exports = { router, apiRouter };
module.exports._test = { classifyHost, buildVendorMeta, renderHtml };