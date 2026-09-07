const Razorpay = require("razorpay");
const env = require("./env");

let razorpayInstance = null;

function getRazorpayInstance() {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    console.warn(
      "[RAZORPAY] Keys not configured. Payment features will be disabled."
    );
    return null;
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret
    });
  }

  return razorpayInstance;
}

module.exports = { getRazorpayInstance };