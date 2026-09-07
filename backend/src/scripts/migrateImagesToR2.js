require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { sequelize, Venue } = require("../database/models");
const { uploadToR2 } = require("../middleware/upload.middleware");

async function migrate() {
  await sequelize.authenticate();
  const venues = await Venue.findAll();
  let migrated = 0;

  for (const venue of venues) {
    let changed = false;

    if (venue.hero_image_url && venue.hero_image_url.startsWith("/uploads")) {
      const localPath = path.join(process.cwd(), venue.hero_image_url.replace(/^\//, ""));
      if (fs.existsSync(localPath)) {
        const buffer = fs.readFileSync(localPath);
        const newUrl = await uploadToR2(buffer, path.basename(localPath), "hero");
        if (newUrl) { venue.hero_image_url = newUrl; changed = true; }
      }
    }

    if (Array.isArray(venue.gallery)) {
      const newGallery = [];
      for (const img of venue.gallery) {
        const url = img.url || img;
        if (typeof url === "string" && url.startsWith("/uploads")) {
          const localPath = path.join(process.cwd(), url.replace(/^\//, ""));
          if (fs.existsSync(localPath)) {
            const buffer = fs.readFileSync(localPath);
            const newUrl = await uploadToR2(buffer, path.basename(localPath), "gallery");
            newGallery.push(newUrl ? { ...img, url: newUrl } : img);
            changed = true;
            continue;
          }
        }
        newGallery.push(img);
      }
      venue.gallery = newGallery;
    }

    if (changed) {
      await venue.save();
      migrated++;
      console.log(`[R2 MIGRATION] Migrated venue: ${venue.hall_name}`);
    }
  }

  console.log(`[R2 MIGRATION] Done. ${migrated} venues migrated.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("[R2 MIGRATION] Failed:", err);
  process.exit(1);
});