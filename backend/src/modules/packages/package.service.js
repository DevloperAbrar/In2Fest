const { Package, Slot } = require("../../database/models");

async function getPackages(venueId, activeOnly = false) {
  const where = { venue_id: venueId };
  if (activeOnly) where.is_active = true;
  return Package.findAll({ where, order: [["created_at", "ASC"]] });
}

async function createPackage(venueId, data) {
  return Package.create({ ...data, venue_id: venueId });
}

async function updatePackage(packageId, venueId, data) {
  const pkg = await Package.findOne({ where: { id: packageId, venue_id: venueId } });
  if (!pkg) throw new Error("Package not found");
  return pkg.update(data);
}

async function togglePackage(packageId, venueId) {
  const pkg = await Package.findOne({ where: { id: packageId, venue_id: venueId } });
  if (!pkg) throw new Error("Package not found");
  return pkg.update({ is_active: !pkg.is_active });
}

async function deletePackage(packageId, venueId) {
  const pkg = await Package.findOne({ where: { id: packageId, venue_id: venueId } });
  if (!pkg) throw new Error("Package not found");
  return pkg.destroy();
}

module.exports = { getPackages, createPackage, updatePackage, togglePackage, deletePackage };