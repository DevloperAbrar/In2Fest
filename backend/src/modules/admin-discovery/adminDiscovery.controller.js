const service = require("./adminDiscovery.service");

const wrap = (fn) => async (req, res, next) => {
  try { await fn(req, res, next); } catch (err) { next(err); }
};

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
    res.status(201).json({ success: true, data: await service.createCategory(req.body) });
  }),
  updateCategory: wrap(async (req, res) => {
    res.json({ success: true, data: await service.updateCategory(req.params.categoryId, req.body) });
  }),
  deleteCategory: wrap(async (req, res) => {
    res.json({ success: true, data: await service.deleteCategory(req.params.categoryId) });
  }),
  getAnalytics: wrap(async (req, res) => {
    res.json({ success: true, data: await service.getAnalytics() });
  })
};