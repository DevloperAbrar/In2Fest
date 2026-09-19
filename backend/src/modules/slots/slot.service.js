const { Slot, Package } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

const NUMERIC_FIELDS = ["base_price", "weekend_price", "price_per_hour", "min_hours", "max_hours", "total_units"];

// Postgres throws a raw 500 for "" against numeric columns instead of a
// friendly validation error, so normalize blank/undefined numeric fields to
// null before they ever reach Sequelize.
function sanitizeSlotData(data) {
  const cleaned = { ...data };
  NUMERIC_FIELDS.forEach((field) => {
    if (cleaned[field] === "" || cleaned[field] === undefined) {
      cleaned[field] = field === "total_units" ? undefined : null;
    } else if (cleaned[field] !== null) {
      cleaned[field] = Number(cleaned[field]);
    }
  });
  return cleaned;
}

async function getSlotsByVenue(venueId, activeOnly = false) {
  const where = { venue_id: venueId };
  if (activeOnly) where.is_active = true;
  return Slot.findAll({ where, order: [["created_at", "ASC"]] });
}

async function createSlot(venueId, data) {
  const cleaned = sanitizeSlotData(data);

  // Server-side guard: a slot must always have a name (the form derives it from
  // the chosen service type) and at least 1 unit.
  if (!cleaned.name || !String(cleaned.name).trim()) {
    throw new AppError("Please select a service type for this slot", 400);
  }
  if (cleaned.total_units !== undefined && (!Number.isInteger(cleaned.total_units) || cleaned.total_units < 1)) {
    throw new AppError("Total units must be at least 1", 400);
  }

  return Slot.create({ ...cleaned, name: String(cleaned.name).trim(), venue_id: venueId });
}

async function updateSlot(slotId, venueId, data) {
  const slot = await Slot.findOne({ where: { id: slotId, venue_id: venueId } });
  if (!slot) throw new AppError("Slot not found", 404);
  return slot.update(sanitizeSlotData(data));
}

async function toggleSlot(slotId, venueId) {
  const slot = await Slot.findOne({ where: { id: slotId, venue_id: venueId } });
  if (!slot) throw new AppError("Slot not found", 404);
  return slot.update({ is_active: !slot.is_active });
}

async function deleteSlot(slotId, venueId) {
  const slot = await Slot.findOne({ where: { id: slotId, venue_id: venueId } });
  if (!slot) throw new AppError("Slot not found", 404);

  try {
    await slot.destroy();
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      throw new AppError(
        "This slot has existing bookings or inquiries and cannot be deleted. Deactivate it instead.",
        409,
        { code: "SLOT_HAS_DEPENDENCIES" }
      );
    }
    throw err;
  }

  // Packages keep their slot ids in a JSON array (no foreign key), so remove
  // the deleted slot from every package - otherwise a stale id is left behind.
  const packages = await Package.findAll({ where: { venue_id: venueId } });
  for (const pkg of packages) {
    const ids = pkg.slot_ids || [];
    if (ids.includes(slotId)) {
      await pkg.update({ slot_ids: ids.filter((id) => id !== slotId) });
    }
  }

  return slot;
}

module.exports = { getSlotsByVenue, createSlot, updateSlot, toggleSlot, deleteSlot };