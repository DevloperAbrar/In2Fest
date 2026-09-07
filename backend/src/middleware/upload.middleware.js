const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");
const { AppError } = require("./error.middleware");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getR2Client } = require("../config/r2");

// Extension is derived from the VALIDATED mimetype, never from the
// user-supplied original filename  - prevents disguising an .html/.svg/etc
// file as an "image" upload (mimetype is attacker-controllable, so trusting
// the original filename's extension would let stored XSS through).
const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isGallery = req.originalUrl.includes("gallery");
    const subfolder = isGallery ? "gallery" : "venues";
    cb(null, path.join(process.cwd(), env.upload.dir, subfolder));
  },
  filename: (req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] || "";
    cb(null, `${uuidv4()}${ext}`);
  }
});

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

async function uploadToR2(fileBuffer, originalName, folder = "gallery") {
  const client = getR2Client();
  if (!client) return null;

  // Strip any directory traversal and non-safe characters from the
  // caller-supplied name before embedding it in the object key.
  const safeName = (originalName || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "-") // keep only safe chars
    .replace(/\.{2,}/g, ".")           // collapse .. sequences
    .slice(0, 80);                     // cap length

  const key = `${folder}/${uuidv4()}-${safeName}`;

  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: "image/jpeg"
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

module.exports = { upload, uploadToR2 };