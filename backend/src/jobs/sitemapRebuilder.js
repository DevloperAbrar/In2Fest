const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { generateSitemapXml } = require("../modules/seo/sitemap.service");

/**
 * Runs daily at 3 AM  - pre-renders sitemap.xml to disk so the /sitemap.xml
 * route can serve a static file instead of regenerating on every request.
 * (The route in sitemap.routes.js still works standalone without this  -
 * this job is purely a performance optimization for higher traffic.)
 */
function startSitemapRebuilder() {
  const uploadsDir = path.join(process.cwd(), "uploads");

  const rebuild = async () => {
    try {
      // generateSitemapXml() returns { mainSitemap, imageSitemap } (two XML strings),
      // not a single string, so each one is written to its own file.
      const { mainSitemap, imageSitemap } = await generateSitemapXml();
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, "sitemap.xml"), mainSitemap);
      fs.writeFileSync(path.join(uploadsDir, "sitemap-images.xml"), imageSitemap);
      console.log("[JOB] Sitemap rebuilt.");
    } catch (error) {
      console.error("[JOB] Sitemap rebuild failed:", error.message);
    }
  };

  cron.schedule("0 3 * * *", rebuild);
  rebuild(); // build once on startup too
  console.log("[JOB] Sitemap rebuilder scheduled (daily 3 AM).");
}

module.exports = { startSitemapRebuilder };