const QRCode = require("qrcode");

/**
 * Generates a UPI payment QR code as a PNG buffer (in-memory only, nothing saved to disk).
 * Returns the buffer, or null if upiId is not set.
 */
async function generateUpiQr(upiId, payeeName, amount, invoiceNumber) {
  if (!upiId) return null;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent("Invoice " + invoiceNumber)}`;

  try {
    const buffer = await QRCode.toBuffer(upiUrl, { width: 300, margin: 1 });
    return buffer;
  } catch {
    return null;
  }
}

module.exports = { generateUpiQr };