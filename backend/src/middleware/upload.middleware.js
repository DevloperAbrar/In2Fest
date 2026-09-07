const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");
const { AppError } = require("./error.middleware");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getR2Client } = require("../config/r2");

const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf"        // ✅ added for invoice PDF uploads
};

const MIME_TO_CONTENT_TYPE = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "application/pdf": "application/pdf"  // ✅ added
};

// Always use memory storage - no files written to disk
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Only JPEG, PNG, and WEBP images are allowed", 400));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.upload.maxFileSizeMb * 1024 * 1024 }
});

/**
 * Upload a buffer to Cloudflare R2.
 * Returns the public URL on success, null if R2 is not configured.
 * Works for images AND PDFs (mimetype decides extension + content-type).
 */
async function uploadToR2(fileBuffer, originalName, folder = "gallery", mimetype = "image/jpeg") {
  const client = getR2Client();
  if (!client) return null;

  const safeName = (originalName || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/\.{2,}/g, ".")
    .slice(0, 80);

  const ext = MIME_TO_EXT[mimetype] || ".bin";          // ✅ fallback .bin instead of .jpg
  const contentType = MIME_TO_CONTENT_TYPE[mimetype] || "application/octet-stream"; // ✅ safe fallback

  const key = `${folder}/${uuidv4()}-${safeName}${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

module.exports = { upload, uploadToR2 };