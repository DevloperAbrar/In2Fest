// backend/src/routes/sitemap.route.js
const express = require("express");
const router = express.Router();
const { Venue, City, Category } = require("../database/models");
const SITE = `https://www.${process.env.BASE_DOMAIN || "in2fest.com"}`;


// Sitemap Index
router.get("/sitemap.xml", (req, res) => {
  res.header("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE}/sitemap-static.xml</loc><lastmod>${new Date().toISOString().split("T")[0]}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-vendors.xml</loc><lastmod>${new Date().toISOString().split("T")[0]}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-cities.xml</loc><lastmod>${new Date().toISOString().split("T")[0]}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-images.xml</loc><lastmod>${new Date().toISOString().split("T")[0]}</lastmod></sitemap>
</sitemapindex>`);
});

// Static pages
router.get("/sitemap-static.xml", (req, res) => {
  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/search", priority: "0.8", changefreq: "daily" },
    { url: "/categories", priority: "0.8", changefreq: "weekly" },
    { url: "/cities", priority: "0.8", changefreq: "weekly" },
    { url: "/for-vendors", priority: "0.7", changefreq: "monthly" },
    { url: "/register-free", priority: "0.7", changefreq: "monthly" },
    { url: "/about", priority: "0.5", changefreq: "monthly" },
    { url: "/contact", priority: "0.5", changefreq: "monthly" },
    { url: "/privacy", priority: "0.3", changefreq: "yearly" },
    { url: "/terms", priority: "0.3", changefreq: "yearly" },
  ];

  const urls = staticPages.map(p => `
  <url>
    <loc>${SITE}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("");

  res.header("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

// Vendor pages
router.get("/sitemap-vendors.xml", async (req, res) => {
  try {
    const venues = await Venue.findAll({
      attributes: ["slug", "city_slug", "category_slug", "updatedAt"],
      where: { is_active: true },
      raw: true
    });

    const urls = venues.map(v => `
  <url>
    <loc>${SITE}/${v.city_slug}/${v.category_slug}/${v.slug}</loc>
    <lastmod>${new Date(v.updatedAt).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("");

    res.header("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  } catch (e) {
    res.status(500).send("Error generating sitemap");
  }
});

// City + Category pages
router.get("/sitemap-cities.xml", async (req, res) => {
  try {
    // Get unique city+category combos from active venues
    const combos = await Venue.findAll({
      attributes: ["city_slug", "category_slug"],
      where: { is_active: true },
      group: ["city_slug", "category_slug"],
      raw: true
    });

    const cityUrls = [...new Set(combos.map(c => c.city_slug))].map(city => `
  <url>
    <loc>${SITE}/${city}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join("");

    const comboCityUrls = combos.map(c => `
  <url>
    <loc>${SITE}/${c.city_slug}/${c.category_slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join("");

    res.header("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${cityUrls}
${comboCityUrls}
</urlset>`);
  } catch (e) {
    res.status(500).send("Error generating sitemap");
  }
});

// Image sitemap
router.get("/sitemap-images.xml", async (req, res) => {
  try {
    const venues = await Venue.findAll({
      attributes: ["slug", "city_slug", "category_slug", "hall_name", "hero_image_url", "gallery"],
      where: { is_active: true },
      raw: true
    });

    const urls = venues.map(v => {
      const pageUrl = `${SITE}/${v.city_slug}/${v.category_slug}/${v.slug}`;
      const images = [];

      if (v.hero_image_url) {
        images.push(`    <image:image>
      <image:loc>${v.hero_image_url}</image:loc>
      <image:title>${v.hall_name} - Cover Photo</image:title>
      <image:caption>${v.hall_name} in ${v.city_slug}</image:caption>
    </image:image>`);
      }

      const gallery = typeof v.gallery === "string" ? JSON.parse(v.gallery) : (v.gallery || []);
      gallery.slice(0, 10).forEach((g, i) => {
        if (g.url) {
          images.push(`    <image:image>
      <image:loc>${g.url}</image:loc>
      <image:title>${v.hall_name} - Photo ${i + 1}</image:title>
    </image:image>`);
        }
      });

      if (images.length === 0) return "";

      return `
  <url>
    <loc>${pageUrl}</loc>
${images.join("\n")}
  </url>`;
    }).filter(Boolean).join("");

    res.header("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`);
  } catch (e) {
    res.status(500).send("Error generating sitemap");
  }
});

module.exports = router;