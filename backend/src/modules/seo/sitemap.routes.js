const express = require("express");
const { generateSitemapXml } = require("./sitemap.service");

const router = express.Router();

let cache = { main: null, image: null, vendor: null, builtAt: 0 };
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getSitemaps() {
  const now = Date.now();
  if (cache.main && (now - cache.builtAt) < CACHE_TTL) return cache;
  const { mainSitemap, imageSitemap, vendorSitemap } = await generateSitemapXml();
  cache = { main: mainSitemap, image: imageSitemap, vendor: vendorSitemap, builtAt: now };
  return cache;
}

// Sitemap index — tells Google all 3 sitemaps exist
router.get("/sitemap-index.xml", async (req, res, next) => {
  try {
    const now = new Date().toISOString().split("T")[0];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.in2fest.com/sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://www.in2fest.com/sitemap-images.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://www.in2fest.com/sitemap-vendors.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) { next(err); }
});

// Main sitemap — all static + city + vendor profile pages
router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const { main } = await getSitemaps();
    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600");
    res.send(main);
  } catch (err) { next(err); }
});

// Image sitemap — all vendor hero + gallery images
router.get("/sitemap-images.xml", async (req, res, next) => {
  try {
    const { image } = await getSitemaps();
    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600");
    res.send(image);
  } catch (err) { next(err); }
});

// Vendor subdomain sites sitemap — armanagment.in2fest.com etc.
router.get("/sitemap-vendors.xml", async (req, res, next) => {
  try {
    const { vendor } = await getSitemaps();
    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600");
    res.send(vendor);
  } catch (err) { next(err); }
});

module.exports = router;