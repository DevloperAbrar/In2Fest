const { Slot } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

async function getSlotsByVenue(venueId, activeOnly = false) {
  const where = { venue_id: venueId };
  if (activeOnly) where.is_active = true;
  return Slot.findAll({ where, order: [["created_at", "ASC"]] });
}

async function createSlot(venueId, data) {
  return Slot.create({ ...data, venue_id: venueId });
}

async function updateSlot(slotId, venueId, data) {
  const slot = await Slot.findOne({ where: { id: slotId, venue_id: venueId } });
  if (!slot) throw new AppError("Slot not found", 404);
  return slot.update(data);
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