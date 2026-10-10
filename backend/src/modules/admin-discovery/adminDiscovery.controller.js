const service = require("./adminDiscovery.service");
const { uploadToR2 } = require("../../middleware/upload.middleware");
const { AppError } = require("../../middleware/error.middleware");

const wrap = (fn) => async (req, res, next) => {
  try { await fn(req, res, next); } catch (err) { next(err); }
};

// Uploads the optional category image to R2 and returns its public URL (or undefined if none sent).
async function categoryImageFromRequest(req) {
  if (!req.file) return undefined;
  const url = await uploadToR2(req.file.buffer, req.file.originalname, "categories", req.file.mimetype);
  if (!url) throw new AppError("Image storage (R2) is not configured on the server", 500);
  return url;
}

module.exports = {
  getFeaturedVendors: wrap(async (req, res) => {
    res.json({ success: true, data: await service.getFeaturedVendors() });
  }),
  setFeaturedVendors: wrap(async (req, res) => {
    res.json({ success: true, data: await service.setFeaturedVendors(req.body.venue_ids) });
  }),
  setVenueBadges: wrap(async (req, res) => {
    res.json({ success: true, data: await service.setVenueBadges(req.params.venueId, req.body) });
  }),
  listCities: wrap(async (req, res) => {
    res.json({ success: true, data: await service.listCities() });
  }),
  createCity: wrap(async (req, res) => {
    res.status(201).json({ success: true, data: await service.createCity(req.body) });
  }),
  updateCity: wrap(async (req, res) => {
    res.json({ success: true, data: await service.updateCity(req.params.cityId, req.body) });
  }),
  listAllCategories: wrap(async (req, res) => {
    res.json({ success: true, data: await service.listAllCategories() });
  }),
  createCategory: wrap(async (req, res) => {
    const imageUrl = await categoryImageFromRequest(req);
    res.status(201).json({ success: true, data: await service.createCategory(req.body, imageUrl) });
  }),
  updateCategory: wrap(async (req, res) => {
    const imageUrl = await categoryImageFromRequest(req);
    res.json({ success: true, data: await service.updateCategory(req.params.categoryId, req.body, imageUrl) });
  }),
  deleteCategory: wrap(async (req, res) => {
    res.json({ success: true, data: await service.deleteCategory(req.params.categoryId) });
  }),
  getAnalytics: wrap(async (req, res) => {
    res.json({ success: true, data: await service.getAnalytics() });
  }),

  // City requests ("Notify me")
  listCityRequests: wrap(async (req, res) => {
    res.json({ success: true, data: await service.listCityRequests(req.query.status) });
  }),
  updateCityRequest: wrap(async (req, res) => {
    res.json({ success: true, data: await service.updateCityRequest(req.params.id, req.body) });
  }),
  bulkUpdateCityRequests: wrap(async (req, res) => {
    res.json({ success: true, data: await service.bulkUpdateCityRequests(req.body) });
  }),
  deleteCityRequest: wrap(async (req, res) => {
    res.json({ success: true, data: await service.deleteCityRequest(req.params.id) });
  })
};