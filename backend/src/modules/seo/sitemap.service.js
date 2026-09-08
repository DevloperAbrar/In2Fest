const { Venue, City, Category } = require("../../database/models");
const { slugify } = require("../../utils/slugify");
const env = require("../../config/env");

async function generateSitemapXml() {
  const discoveryDomain = `https://${env.baseDomain}`;
  const urls = [];
  const imageUrls = []; // separate image sitemap entries

  // ── Static pages ──────────────────────────────────────────
  urls.push({ loc: `${discoveryDomain}/`,               priority: "1.0", changefreq: "daily"   });
  urls.push({ loc: `${discoveryDomain}/search`,         priority: "0.8", changefreq: "daily"   });
  urls.push({ loc: `${discoveryDomain}/categories`,     priority: "0.8", changefreq: "weekly"  });
  urls.push({ loc: `${discoveryDomain}/cities`,         priority: "0.8", changefreq: "weekly"  });
  urls.push({ loc: `${discoveryDomain}/for-vendors`,    priority: "0.7", changefreq: "monthly" });
  urls.push({ loc: `${discoveryDomain}/register-free`,  priority: "0.7", changefreq: "monthly" });
  urls.push({ loc: `${discoveryDomain}/about`,          priority: "0.5", changefreq: "monthly" });
  urls.push({ loc: `${discoveryDomain}/contact`,        priority: "0.5", changefreq: "monthly" });
  urls.push({ loc: `${discoveryDomain}/privacy`,        priority: "0.3", changefreq: "yearly"  });
  urls.push({ loc: `${discoveryDomain}/terms`,          priority: "0.3", changefreq: "yearly"  });

  // ── Cities & States ───────────────────────────────────────
  const cities = await City.findAll({ where: { active: true } });
  const states = [...new Set(cities.map((c) => c.state_slug))];

  states.forEach((stateSlug) => {
    urls.push({ loc: `${discoveryDomain}/state/${stateSlug}`, priority: "0.9", changefreq: "weekly" });
  });

  const categories = await Category.findAll({ where: { active: true } });

  cities.forEach((city) => {
    urls.push({ loc: `${discoveryDomain}/${city.slug}`, priority: "0.9", changefreq: "weekly" });
    categories.forEach((cat) => {
      urls.push({ loc: `${discoveryDomain}/${city.slug}/${cat.slug}`, priority: "0.8", changefreq: "weekly" });
    });
  });

  // ── Vendor pages + Image sitemap ──────────────────────────
  const venues = await Venue.findAll({
    where: { is_active: true, marketplace_listed: true },
    attributes: [
      "subdomain", "city", "business_category",
      "hall_name", "hero_image_url", "gallery",
      "about_text", "updatedAt"
    ]
  });

  venues.forEach((v) => {
    if (!v.business_category) return;

    const citySlug  = slugify(v.city);
    const catSlug   = v.business_category;
    const loc       = `${discoveryDomain}/${citySlug}/${catSlug}/${v.subdomain}`;
    const lastmod   = new Date(v.updatedAt).toISOString().split("T")[0];

    // Vendor page in main sitemap
    urls.push({ loc, priority: "0.7", changefreq: "weekly", lastmod });

    // ── Image sitemap entries ─────────────────────────────
    const images = [];

    // Hero image
    if (v.hero_image_url) {
      images.push({
        loc: v.hero_image_url,
        title: `${v.hall_name} - ${catSlug.replace(/-/g, " ")} in ${v.city}`,
        caption: `${v.hall_name} is a verified ${catSlug.replace(/-/g, " ")} in ${v.city} listed on In2Fest`
      });
    }

    // Gallery images (max 10 per vendor — Google limit)
    const gallery = Array.isArray(v.gallery) ? v.gallery : [];
    gallery.slice(0, 10).forEach((g, idx) => {
      if (!g?.url) return;
      images.push({
        loc: g.url,
        title: `${v.hall_name} - Photo ${idx + 1} | ${catSlug.replace(/-/g, " ")} in ${v.city}`,
        caption: `${v.hall_name} gallery photo - ${catSlug.replace(/-/g, " ")} in ${v.city}`
      });
    });

    if (images.length > 0) {
      imageUrls.push({ pageLoc: loc, images });
    }
  });

  // ── Build main sitemap XML ────────────────────────────────
  const mainXmlBody = urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod   ? `<lastmod>${u.lastmod}</lastmod>`         : ""}
    ${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ""}
    <priority>${u.priority}</priority>
  </url>`).join("\n");

  const mainSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${mainXmlBody}
</urlset>`;

  // ── Build image sitemap XML ───────────────────────────────
  const imageXmlBody = imageUrls.map((entry) => {
    const imageBlocks = entry.images.map((img) => `    <image:image>
      <image:loc>${img.loc}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
      <image:caption>${escapeXml(img.caption)}</image:caption>
    </image:image>`).join("\n");

    return `  <url>
    <loc>${entry.pageLoc}</loc>
${imageBlocks}
  </url>`;
  }).join("\n");

  const imageSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${imageXmlBody}
</urlset>`;

  return { mainSitemap, imageSitemap };
}

// Escape special XML chars in titles/captions
function escapeXml(str = "") {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&apos;");
}

module.exports = { generateSitemapXml };