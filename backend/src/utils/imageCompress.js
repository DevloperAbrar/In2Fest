const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

/**
 * Compresses an image in place  - resizes to a sane max width and
 * re-encodes as compressed webp/jpeg to control storage costs.
 */
async function compressImage(filePath, options = {}) {
  const { maxWidth = 1600, quality = 75 } = options;

  const tempPath = `${filePath}.tmp`;
  const ext = path.extname(filePath).toLowerCase();

  let pipeline = sharp(filePath).resize({ width: maxWidth, withoutEnlargement: true });

  if (ext === ".png") {
    pipeline = pipeline.png({ quality, compressionLevel: 8 });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality });
  } else {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  await pipeline.toFile(tempPath);
  fs.renameSync(tempPath, filePath);

  return filePath;
}

module.exports = { compressImage };