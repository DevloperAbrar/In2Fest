const { Venue } = require("../database/models");
const env = require("../config/env");

/**
 * Reads the incoming hostname, extracts the venue subdomain, and attaches
 * that venue's public data to req.venue. This is what makes
 * venuename.venuesafar.com work dynamically from one codebase.
 */
async function resolveSubdomain(req, res, next) {
  try {
    const host = req.hostname; // e.g. "grandpalace.venuesafar.com"
    const baseDomainParts = env.baseDomain.split(".").length;
    const hostParts = host.split(".");

    // If hostname has more parts than the base domain, the extra prefix is the subdomain
    if (hostParts.length > baseDomainParts) {
      const subdomain = hostParts[0];

      if (subdomain && subdomain !== "www" && subdomain !== "app") {
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
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { resolveSubdomain };