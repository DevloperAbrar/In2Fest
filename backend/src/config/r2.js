const { S3Client } = require("@aws-sdk/client-s3");

let r2Client = null;

function getR2Client() {
  if (!process.env.R2_ACCOUNT_ID) return null; // R2 not configured  - falls back to local disk

  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
  }
  return r2Client;
}

module.exports = { getR2Client };