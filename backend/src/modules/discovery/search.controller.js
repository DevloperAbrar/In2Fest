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

module.exports = { searchVendors, autocomplete };