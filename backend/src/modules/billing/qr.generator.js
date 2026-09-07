const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const env = require("../../config/env");

/**
 * Generates a scannable UPI payment QR code image and saves it to disk.
 * No payment gateway integration needed  - this is a static UPI deep link QR.
 */
async function generateUpiQr(upiId, payeeName, amount, invoiceNumber) {
  if (!upiId) return null;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent("Invoice " + invoiceNumber)}`;

  const dir = path.join(process.cwd(), env.upload.dir, "invoices");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fileName = `qr-${invoiceNumber.replace(/[^a-zA-Z0-9]/g, "")}.png`;
  const filePath = path.join(dir, fileName);

  await QRCode.toFile(filePath, upiUrl, { width: 300, margin: 1 });

  return `/uploads/invoices/${fileName}`;
}

module.exports = { generateUpiQr };