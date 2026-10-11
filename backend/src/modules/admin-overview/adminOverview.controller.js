const service = require("./adminOverview.service");

function handler(fn) {
  return async (req, res, next) => {
    try {
      const data = await fn(req.query);
      res.set("Cache-Control", "no-store");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  getSummary: handler(() => service.getSummary()),
  getRegistrations: handler((query) => service.getRegistrations(query)),
  getLogins: handler((query) => service.getLogins(query)),
  getPlans: handler(() => service.getPlans()),
  getMarketplace: handler(() => service.getMarketplace()),
  getSystem: handler(() => service.getSystem())
};