const axios = require("axios");
const env = require("../config/env");

/**
 * Verifies a Google Identity Services credential (ID token) sent from the browser
 * (google.accounts.id button / One Tap). Uses Google's tokeninfo endpoint so we don't
 * need to pull in google-auth-library just for this one check.
 *
 * Returns { email, name, sub, picture } on success, throws on any failure.
 */
async function verifyGoogleIdToken(credential) {
  if (!credential) {
    const err = new Error("Google credential is missing");
    err.statusCode = 400;
    throw err;
  }

  let payload;
  try {
    const { data } = await axios.get("https://oauth2.googleapis.com/tokeninfo", {
      params: { id_token: credential }
    });
    payload = data;
  } catch {
    const err = new Error("Could not verify Google sign-in, please try again");
    err.statusCode = 401;
    throw err;
  }

  if (payload.aud !== env.google.clientId) {
    const err = new Error("Google credential was not issued for this app");
    err.statusCode = 401;
    throw err;
  }

  if (payload.email_verified !== "true" && payload.email_verified !== true) {
    const err = new Error("Google account email is not verified");
    err.statusCode = 401;
    throw err;
  }

  return {
    email: payload.email,
    name: payload.name || payload.given_name || "",
    sub: payload.sub,
    picture: payload.picture || null
  };
}

module.exports = { verifyGoogleIdToken };