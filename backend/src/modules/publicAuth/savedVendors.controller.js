const { SavedVendor, Venue } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

/**
 * GET /api/public-auth/saved
 * Returns all saved vendors for the logged-in public user.
 */
async function getSaved(req, res, next) {
  try {
    const rows = await SavedVendor.findAll({
      where: { public_user_id: req.publicUser.id },
      include: [{
        model: Venue,
        as: "venue",
        attributes: ["id", "hall_name", "slug", "city", "hero_image_url", "category_slug", "city_slug"]
      }]
    });

    res.json({
      success: true,
      data: rows.map(r => r.venue).filter(Boolean)
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public-auth/saved/:venueId
 * Toggle save for a venue. Returns { saved: true/false }.
 */
async function toggleSave(req, res, next) {
  try {
    const { venueId } = req.params;

    const existing = await SavedVendor.findOne({
      where: { public_user_id: req.publicUser.id, venue_id: venueId }
    });

    if (existing) {
      await existing.destroy();
      return res.json({ success: true, saved: false });
    }

    // Verify venue exists
    const venue = await Venue.findByPk(venueId, { attributes: ["id"] });
    if (!venue) throw new AppError("Venue not found", 404);

    await SavedVendor.create({ public_user_id: req.publicUser.id, venue_id: venueId });
    res.json({ success: true, saved: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/public-auth/saved/:venueId/status
 * Returns { saved: true/false } for one venue — used on page load.
 */
async function getSaveStatus(req, res, next) {
  try {
    const { venueId } = req.params;
    const row = await SavedVendor.findOne({
      where: { public_user_id: req.publicUser.id, venue_id: venueId }
    });
    res.json({ success: true, saved: !!row });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSaved, toggleSave, getSaveStatus };