const axios = require("axios");
const env = require("./env");

let cashfreeClient = null;

/**
 * Thin axios wrapper around Cashfree's PG REST API (Orders API, v3).
 * We talk to Cashfree over plain REST instead of an SDK so we're not locked
 * to a particular npm package's version quirks.
 */
function getCashfreeClient() {
  if (!env.cashfree.appId || !env.cashfree.secretKey) {
    console.warn(
      "[CASHFREE] Keys not configured. Payment features will be disabled."
    );
    return null;
  }

  if (!cashfreeClient) {
    const baseURL =
      env.cashfree.env === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    cashfreeClient = axios.create({
      baseURL,
      headers: {
        "x-client-id": env.cashfree.appId,
        "x-client-secret": env.cashfree.secretKey,
        "x-api-version": env.cashfree.apiVersion,
        "Content-Type": "application/json"
      }
    });
  }

  return cashfreeClient;
}

module.exports = { getCashfreeClient };