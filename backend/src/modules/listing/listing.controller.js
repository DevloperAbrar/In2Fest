const listingService = require("./listing.service");

async function registerFreeListing(req, res, next) {
  try {
    const listing = await listingService.registerFreeListing(req.body);
    res.status(201).json({ success: true, data: { listing_id: listing.id } });
  } catch (error) {
    next(error);
  }
}

async function getPublicListing(req, res, next) {
  try {
    const listing = await listingService.getPublicListing(req.params.id);
    listingService.incrementProfileView(req.params.id); // fire-and-forget
    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
}

async function adminListAll(req, res, next) {
  try {
    const listings = await listingService.adminListAll(req.query);
    res.json({ success: true, data: listings });
  } catch (error) {
    next(error);
  }
}

async function adminApprove(req, res, next) {
  try {
    const listing = await listingService.adminApprove(req.params.id);
    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
}

async function adminReject(req, res, next) {
  try {
    const listing = await listingService.adminReject(req.params.id);
    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
}

async function sendUpgradeLink(req, res, next) {
  try {
    const result = await listingService.sendUpgradeLink(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerFreeListing, getPublicListing,
  adminListAll, adminApprove, adminReject, sendUpgradeLink
};