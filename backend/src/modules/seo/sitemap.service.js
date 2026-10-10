const { Venue, City, Category } = require("../../database/models");
const { slugify } = require("../../utils/slugify");
const env = require("../../config/env");

const BASE = env.baseDomain || "in2fest.com";
const SITE = `https://www.${BASE}`;
const API_BASE = (process.env.API_PUBLIC_URL || `https://api.${BASE}`).replace(/\/$/, "");

function escapeXml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const toDate = (d) => {
  const t = d ? new Date(d) : null;
  return t && !Number.isNaN(t.getTime()) ? t.toISOString().split("T")[0] : null;
};

// Image URLs in a sitemap must be absolute.
function absoluteUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Google ignores changefreq and priority, and ignores lastmod when it is not reliable.
// So only a real lastmod is written, and only when we actually know it.
function urlTag({ loc, lastmod }) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`;
}

async function generateSitemapXml() {
  // 1. Static pages (no fake lastmod)
  const staticUrls = [
    { loc: `${SITE}/` },
    { loc: `${SITE}/search` },
    { loc: `${SITE}/categories` },
    { loc: `${SITE}/cities` },
    { loc: `${SITE}/for-vendors` },
    { loc: `${SITE}/register-free` },
    { loc: `${SITE}/get-website` },
    { loc: `${SITE}/about` },
    { loc: `${SITE}/contact` },
    { loc: `${SITE}/privacy` },
    { loc: `${SITE}/terms` }
  ];

  // 2. Data
  const [cities, categories, venues] = await Promise.all([
    City.findAll({ where: { active: true } }),
    Category.findAll({ where: { active: true } }),
    Venue.findAll({
      where: { is_active: true, marketplace_listed: true },
      attributes: ["subdomain", "city", "business_category", "hall_name", "hero_image_url", "gallery", "updatedAt"]
    })
  ]);

  // City + category pages are only listed when at least one vendor exists there.
  // Empty landing pages are thin content and waste crawl budget.
  const comboLastmod = new Map(); // "city-slug/category-slug" -> latest vendor update
  const cityLastmod = new Map();
  venues.forEach((v) => {
    if (!v.business_category || !v.city) return;
    const citySlug = slugify(v.city);
    const key = `${citySlug}/${v.business_category}`;
    const d = toDate(v.updatedAt);
    if (d && (!comboLastmod.get(key) || d > comboLastmod.get(key))) comboLastmod.set(key, d);
    if (d && (!cityLastmod.get(citySlug) || d > cityLastmod.get(citySlug))) cityLastmod.set(citySlug, d);
  });

  const states = [...new Set(cities.map((c) => c.state_slug).filter(Boolean))];
  const cityUrls = [];
  states.forEach((stateSlug) => cityUrls.push({ loc: `${SITE}/state/${stateSlug}` }));

  cities.forEach((city) => {
    cityUrls.push({ loc: `${SITE}/${city.slug}`, lastmod: cityLastmod.get(city.slug) || null });
    categories.forEach((cat) => {
      const key = `${city.slug}/${cat.slug}`;
      if (comboLastmod.has(key)) {
        cityUrls.push({ loc: `${SITE}/${city.slug}/${cat.slug}`, lastmod: comboLastmod.get(key) });
      }
    });
  });

  // 3. Vendor profile pages + image entries
  const vendorUrls = [];
  const imageEntries = [];

  venues.forEach((v) => {
    if (!v.business_category || !v.city || !v.subdomain) return;

    const citySlug = slugify(v.city);
    const catSlug = v.business_category;
    const catName = catSlug.replace(/-/g, " ");
    const loc = `${SITE}/${citySlug}/${catSlug}/${v.subdomain}`;

    vendorUrls.push({ loc, lastmod: toDate(v.updatedAt) });

    const images = [];
    const hero = absoluteUrl(v.hero_image_url);
    if (hero) {
      images.push({
        loc: hero,
        title: `${v.hall_name} - ${catName} in ${v.city}`,
        caption: `${v.hall_name} is a verified ${catName} in ${v.city} listed on In2Fest`
      });
    }
    (Array.isArray(v.gallery) ? v.gallery : []).slice(0, 10).forEach((g, idx) => {
      const u = absoluteUrl(g?.url);
      if (!u) return;
      images.push({
        loc: u,
        title: `${v.hall_name} - Photo ${idx + 1} | ${catName} in ${v.city}`,
        caption: `${v.hall_name} gallery, ${catName} in ${v.city} on In2Fest`
      });
    });
    if (images.length > 0) imageEntries.push({ pageLoc: loc, images });
  });

  // 4. Main sitemap
  const allMainUrls = [...staticUrls, ...cityUrls, ...vendorUrls];
  const mainSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allMainUrls.map(urlTag).join("\n")}
</urlset>`;

  // 5. Image sitemap
  const imageXmlBody = imageEntries
    .map((entry) => {
      const blocks = entry.images
        .map(
          (img) => `    <image:image>
      <image:loc>${escapeXml(img.loc)}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
      <image:caption>${escapeXml(img.caption)}</image:caption>
    </image:image>`
        )
        .join("\n");
      return `  <url>\n    <loc>${escapeXml(entry.pageLoc)}</loc>\n${blocks}\n  </url>`;
    })
    .join("\n");

  const imageSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${imageXmlBody}
</urlset>`;

  // 6. Vendor subdomain sitemap.
  // URLs on other hosts (name.in2fest.com) are not allowed inside a www sitemap, so this file
  // is kept only for a future per-subdomain sitemap and is NOT referenced from the index.
  const vendorSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${venues
  .filter((v) => v.subdomain)
  .map((v) => urlTag({ loc: `https://${v.subdomain}.${BASE}/`, lastmod: toDate(v.updatedAt) }))
  .join("\n")}
</urlset>`;

  return { mainSitemap, imageSitemap, vendorSitemap };
}

module.exports = { generateSitemapXml };