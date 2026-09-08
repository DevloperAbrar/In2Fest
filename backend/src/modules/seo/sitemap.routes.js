const express = require("express");
const { generateSitemapXml } = require("./sitemap.service");

const router = express.Router();

// Cache karo memory mein — har request pe DB hit nahi
let cache = { main: null, image: null, builtAt: 0 };
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getSitemaps() {
  const now = Date.now();
  if (cache.main && (now - cache.builtAt) < CACHE_TTL) {
    return cache;
  }
  const { mainSitemap, imageSitemap } = await generateSitemapXml();
  cache = { main: mainSitemap, image: imageSitemap, builtAt: now };
  return cache;
}

// Main sitemap — all pages
router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const { main } = await getSitemaps();
    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600");
    res.send(main);
  } catch (error) {
    next(error);
  }
});

// Image sitemap — all vendor images
router.get("/sitemap-images.xml", async (req, res, next) => {
  try {
    const { image } = await getSitemaps();
    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600");
    res.send(image);
  } catch (error) {
    next(error);
  }
});

module.exports = router;