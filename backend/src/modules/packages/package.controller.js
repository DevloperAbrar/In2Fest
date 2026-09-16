const packageService = require("./package.service");

async function getPackages(req, res, next) {
  try {
    const activeOnly = req.query.activeOnly === "true";
    const data = await packageService.getPackages(req.params.venueId, activeOnly);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function createPackage(req, res, next) {
  try {
    const data = await packageService.createPackage(req.params.venueId, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

async function updatePackage(req, res, next) {
  try {
    const data = await packageService.updatePackage(req.params.packageId, req.params.venueId, req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function togglePackage(req, res, next) {
  try {
    const data = await packageService.togglePackage(req.params.packageId, req.params.venueId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function deletePackage(req, res, next) {
  try {
    await packageService.deletePackage(req.params.packageId, req.params.venueId);
    res.json({ success: true, message: "Package deleted" });
  } catch (e) { next(e); }
}

module.exports = { getPackages, createPackage, updatePackage, togglePackage, deletePackage };