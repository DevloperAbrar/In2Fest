const cron = require("node-cron");
const { VendorListing } = require("../database/models");
const { sendWhatsApp } = require("../modules/whatsapp/whatsapp.service");
const env = require("../config/env");

/**
 * Runs on the 1st of every month at 10 AM  - nudges every active free-tier
 * vendor to upgrade to full SaaS.
 */
function startFreeListingNudge() {
  cron.schedule("0 10 1 * *", async () => {
    console.log("[JOB] Running monthly free-listing upgrade nudge...");

    const listings = await VendorListing.findAll({ where: { status: "active" } });

    for (const listing of listings) {
      await sendWhatsApp({
        recipientPhone: listing.whatsapp_number || listing.phone,
        triggerType: "free_listing_nudge",
        variables: {
          name: listing.owner_name,
          views: listing.profile_views,
          upgradeLink: `https://${env.baseDomain}/register-free?upgrade=${listing.id}`
        }
      });
    }

    console.log(`[JOB] Upgrade nudge sent to ${listings.length} free-tier vendors.`);
  });

  console.log("[JOB] Free listing nudge scheduled (1st of every month, 10 AM).");
}

module.exports = { startFreeListingNudge };