const express = require("express");
const { generateSitemapXml } = require("./sitemap.service");
const env = require("../../config/env");

const router = express.Router();

const SITE = `https://www.${env.baseDomain || "in2fest.com"}`;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

let cache = { main: null, image: null, vendor: null, builtAt: 0 };

// Serves a stale copy if the database is briefly unavailable, so Google never gets a 500.
async function getSitemaps() {
  const now = Date.now();
  if (cache.main && now - cache.builtAt < CACHE_TTL) return cache;
  try {
    const { mainSitemap, imageSitemap, vendorSitemap } = await generateSitemapXml();
    cache = { main: mainSitemap, image: imageSitemap, vendor: vendorSitemap, builtAt: now };
  } catch (err) {
    if (!cache.main) throw err;
    console.error("[SITEMAP] rebuild failed, serving stale copy:", err.message);
  }
  return cache;
}

function sendXml(res, xml) {
  res.set({
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600"
  });
  res.send(xml);
}

// Sitemap index: main pages + image sitemap
router.get("/sitemap-index.xml", async (req, res, next) => {
  try {
    const { builtAt } = await getSitemaps();
    const lastmod = new Date(builtAt || Date.now()).toISOString().split("T")[0];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE}/sitemap.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE}/sitemap-images.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>`;
    sendXml(res, xml);
  } catch (err) {
    next(err);
  }
});

router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const { main } = await getSitemaps();
    sendXml(res, main);
  } catch (err) {
    next(err);
  }
});

router.get("/sitemap-images.xml", async (req, res, next) => {
  try {
    const { image } = await getSitemaps();
    sendXml(res, image);
  } catch (err) {
    next(err);
  }
});

router.get("/sitemap-vendors.xml", async (req, res, next) => {
  try {
    const { vendor } = await getSitemaps();
    sendXml(res, vendor);
  } catch (err) {
    next(err);
  }
});

module.exports = router;