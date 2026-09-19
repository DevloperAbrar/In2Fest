const { Package, Slot } = require("../../database/models");

// slot_ids lives in a JSON column (no foreign key), so anything the client
// sends is stored as-is. Keep only ids of slots that really exist for this
// venue, so stale/deleted slot ids can never be saved into a package.
async function keepExistingSlotIds(venueId, slotIds) {
  const ids = Array.isArray(slotIds) ? slotIds : [];
  if (ids.length === 0) return [];
  const venueSlots = await Slot.findAll({ where: { venue_id: venueId }, attributes: ["id"] });
  const valid = new Set(venueSlots.map((s) => s.id));
  return [...new Set(ids)].filter((id) => valid.has(id));
}

async function getPackages(venueId, activeOnly = false) {
  const where = { venue_id: venueId };
  if (activeOnly) where.is_active = true;
  return Package.findAll({ where, order: [["created_at", "ASC"]] });
}

async function createPackage(venueId, data) {
  const slot_ids = await keepExistingSlotIds(venueId, data.slot_ids);
  return Package.create({ ...data, slot_ids, venue_id: venueId });
}

async function updatePackage(packageId, venueId, data) {
  const pkg = await Package.findOne({ where: { id: packageId, venue_id: venueId } });
  if (!pkg) throw new Error("Package not found");

  const payload = { ...data };
  if (payload.slot_ids !== undefined) {
    payload.slot_ids = await keepExistingSlotIds(venueId, payload.slot_ids);
  }
  return pkg.update(payload);
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