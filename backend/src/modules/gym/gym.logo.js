const sharp = require("sharp");
const { uploadToR2 } = require("../../middleware/upload.middleware");
const { AppError } = require("../../middleware/error.middleware");

// The gym logo is stored once on the venue (venues.logo_url) and used on the membership card,
// receipts and workout PDFs. It is always saved as a PNG (max 512 px) so transparent logos keep
// their transparency and every PDF / card renderer can read it.
async function setLogo(venue, file) {
  if (!file) throw new AppError("Choose a logo image to upload", 400);
  let png;
  try {
    png = await sharp(file.buffer)
      .rotate()
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch {
    throw new AppError("This file is not a valid image", 400);
  }
  const url = await uploadToR2(png, "gym-logo.png", `gym/${venue.id}/logo`, "image/png");
  if (!url) throw new AppError("Image storage is not configured", 503);
  await venue.update({ logo_url: url });
  return { logo_url: url };
}

async function removeLogo(venue) {
  await venue.update({ logo_url: null });
  return { logo_url: null };
}

module.exports = { setLogo, removeLogo };