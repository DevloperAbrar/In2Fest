const searchService = require("./search.service");

async function searchVendors(req, res, next) {
  try {
    const result = await searchService.search(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function autocomplete(req, res, next) {
  try {
    const result = await searchService.autocomplete(req.query.q);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// Business types with counts, for the filter chips and the links on category pages.
// GET /discovery/business-types?city=gwalior&category=other-business
async function businessTypes(req, res, next) {
  try {
    const result = await searchService.getBusinessTypeFacets({ city: req.query.city, category: req.query.category });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = { searchVendors, autocomplete, businessTypes };