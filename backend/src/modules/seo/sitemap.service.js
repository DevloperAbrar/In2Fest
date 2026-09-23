const { Venue, City, Category } = require("../../database/models");
const { slugify } = require("../../utils/slugify");
const env = require("../../config/env");

const SITE = `https://www.${env.baseDomain || "in2fest.com"}`;
const VENDOR_SITE = (subdomain) => `https://${subdomain}.in2fest.com`;

function escapeXml(str = "") {
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&apos;");
}

function urlTag({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${loc}</loc>
    ${lastmod    ? `<lastmod>${lastmod}</lastmod>`           : ""}
    ${changefreq ? `<changefreq>${changefreq}</changefreq>` : ""}
    <priority>${priority}</priority>
  </url>`;
}

async function generateSitemapXml() {
  // ── 1. Static pages ──────────────────────────────────────
  const staticUrls = [
    { loc: `${SITE}/`,                priority: "1.0", changefreq: "daily"   },
    { loc: `${SITE}/search`,          priority: "0.9", changefreq: "daily"   },
    { loc: `${SITE}/categories`,      priority: "0.9", changefreq: "weekly"  },
    { loc: `${SITE}/cities`,          priority: "0.8", changefreq: "weekly"  },
    { loc: `${SITE}/for-vendors`,     priority: "0.7", changefreq: "monthly" },
    { loc: `${SITE}/register-free`,   priority: "0.8", changefreq: "monthly" },
    { loc: `${SITE}/about`,           priority: "0.5", changefreq: "monthly" },
    { loc: `${SITE}/contact`,         priority: "0.5", changefreq: "monthly" },
    { loc: `${SITE}/privacy`,         priority: "0.3", changefreq: "yearly"  },
    { loc: `${SITE}/terms`,           priority: "0.3", changefreq: "yearly"  },
  ];

  // ── 2. Cities & state pages ───────────────────────────────
  const cities = await City.findAll({ where: { active: true } });
  const categories = await Category.findAll({ where: { active: true } });
  const states = [...new Set(cities.map(c => c.state_slug).filter(Boolean))];

  const cityUrls = [];
  states.forEach(stateSlug => {
    cityUrls.push({ loc: `${SITE}/state/${stateSlug}`, priority: "0.9", changefreq: "weekly" });
  });
  cities.forEach(city => {
    cityUrls.push({ loc: `${SITE}/${city.slug}`, priority: "0.9", changefreq: "weekly" });
    categories.forEach(cat => {
      cityUrls.push({ loc: `${SITE}/${city.slug}/${cat.slug}`, priority: "0.8", changefreq: "weekly" });
    });
  });

  // ── 3. Vendor public profile pages ───────────────────────
  const venues = await Venue.findAll({
    where: { is_active: true, marketplace_listed: true },
    attributes: ["subdomain", "city", "business_category", "hall_name", "hero_image_url", "gallery", "about_text", "updatedAt"],
  });

  const vendorUrls = [];
  const imageEntries = [];
  const vendorSiteUrls = []; // separate sitemap for subdomain sites

  venues.forEach(v => {
    if (!v.business_category || !v.city) return;

    const citySlug = slugify(v.city);
    const catSlug  = v.business_category;
    const lastmod  = new Date(v.updatedAt).toISOString().split("T")[0];
    const loc      = `${SITE}/${citySlug}/${catSlug}/${v.subdomain}`;

    // Main discovery page
    vendorUrls.push({ loc, priority: "0.7", changefreq: "weekly", lastmod });

    // Vendor's own subdomain website (armanagment.in2fest.com)
    vendorSiteUrls.push({
      loc: VENDOR_SITE(v.subdomain),
      priority: "0.6",
      changefreq: "weekly",
      lastmod,
    });

    // Image sitemap
    const images = [];
    if (v.hero_image_url) {
      images.push({
        loc: v.hero_image_url,
        title: `${v.hall_name} - ${catSlug.replace(/-/g, " ")} in ${v.city}`,
        caption: `${v.hall_name} is a verified ${catSlug.replace(/-/g, " ")} in ${v.city} listed on In2Fest`,
      });
    }
    (Array.isArray(v.gallery) ? v.gallery : []).slice(0, 10).forEach((g, idx) => {
      if (!g?.url) return;
      images.push({
        loc: g.url,
        title: `${v.hall_name} - Gallery Photo ${idx + 1} | ${catSlug.replace(/-/g, " ")} in ${v.city}`,
        caption: `${v.hall_name} gallery — ${catSlug.replace(/-/g, " ")} in ${v.city} on In2Fest`,
      });
    });
    if (images.length > 0) imageEntries.push({ pageLoc: loc, images });
  });

  // ── 4. Build main sitemap XML ─────────────────────────────
  const allMainUrls = [...staticUrls, ...cityUrls, ...vendorUrls];
  const mainSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allMainUrls.map(urlTag).join("\n")}
</urlset>`;

  // ── 5. Build image sitemap XML ────────────────────────────
  const imageXmlBody = imageEntries.map(entry => {
    const imgBlocks = entry.images.map(img =>
      `    <image:image>
      <image:loc>${img.loc}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
      <image:caption>${escapeXml(img.caption)}</image:caption>
    </image:image>`
    ).join("\n");
    return `  <url>\n    <loc>${entry.pageLoc}</loc>\n${imgBlocks}\n  </url>`;
  }).join("\n");

  const imageSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${imageXmlBody}
</urlset>`;

  // ── 6. Build vendor-sites sitemap XML ────────────────────
  const vendorSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${vendorSiteUrls.map(urlTag).join("\n")}
</urlset>`;

  return { mainSitemap, imageSitemap, vendorSitemap };
}

module.exports = { generateSitemapXml };