const { Slot } = require("../../database/models");
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
  return Slot.create({ ...sanitizeSlotData(data), venue_id: venueId });
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
    return await slot.destroy();
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
}

module.exports = { getSlotsByVenue, createSlot, updateSlot, toggleSlot, deleteSlot };