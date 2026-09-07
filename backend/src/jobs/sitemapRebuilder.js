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
  const outputPath = path.join(process.cwd(), "uploads", "sitemap.xml");

  const rebuild = async () => {
    try {
      const xml = await generateSitemapXml();
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, xml);
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