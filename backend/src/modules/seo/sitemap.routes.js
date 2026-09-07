const express = require("express");
const { generateSitemapXml } = require("./sitemap.service");

const router = express.Router();

router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const xml = await generateSitemapXml();
    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600"); // 1 hour  - good enough without a cron job
    res.send(xml);
  } catch (error) {
    next(error);
  }
});

module.exports = router;