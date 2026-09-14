const { Venue } = require("../database/models");
const env = require("../config/env");

/**
 * Reads the incoming hostname, extracts the venue subdomain, and attaches
 * that venue's public data to req.venue. This is what makes
 * venuename.venuesafar.com work dynamically from one codebase.
 */
async function resolveSubdomain(req, res, next) {
  try {
    const host = req.hostname; // e.g. "ar-event.localhost" or "grandpalace.venuesafar.com"
    const baseDomainParts = env.baseDomain.split(".").length;
    const hostParts = host.split(".");

    let subdomain = null;

    // Production: subdomain.venuesafar.com (more parts than base domain)
    if (hostParts.length > baseDomainParts) {
      subdomain = hostParts[0];
    }

    // Local dev: ar-event.localhost (2 parts, last part is "localhost")
    if (!subdomain && hostParts.length === 2 && hostParts[1] === "localhost") {
      subdomain = hostParts[0];
    }

    const reserved = ["www", "app", "api", "admin"];

    if (subdomain && !reserved.includes(subdomain)) {
      const venue = await Venue.findOne({
        where: { subdomain, is_active: true }
      });

      if (!venue) {
        return res.status(404).json({
          success: false,
          message: "This venue page does not exist or is no longer active."
        });
      }

      if (!venue.is_live) {
        return res.status(404).json({
          success: false,
          message: "This venue website is not yet live."
        });
      }

      req.venue = venue;
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { resolveSubdomain };