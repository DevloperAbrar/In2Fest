const slotService = require("./slot.service");

async function createSlot(req, res, next) {
  try {
    const slot = await slotService.createSlot(req.params.venueId, req.body);
    res.status(201).json({ success: true, data: slot });
  } catch (e) { next(e); }
}

async function getSlots(req, res, next) {
  try {
    const activeOnly = req.query.activeOnly === "true";
    const slots = await slotService.getSlotsByVenue(req.params.venueId, activeOnly);
    res.json({ success: true, data: slots });
  } catch (e) { next(e); }
}

// Public - no auth. Always returns ACTIVE slots only.
async function getPublicSlots(req, res, next) {
  try {
    const slots = await slotService.getSlotsByVenue(req.params.venueId, true);
    res.json({ success: true, data: slots });
  } catch (e) { next(e); }
}

async function updateSlot(req, res, next) {
  try {
    const slot = await slotService.updateSlot(req.params.slotId, req.params.venueId, req.body);
    res.json({ success: true, data: slot });
  } catch (e) { next(e); }
}

async function toggleSlot(req, res, next) {
  try {
    const slot = await slotService.toggleSlot(req.params.slotId, req.params.venueId);
    res.json({ success: true, data: slot });
  } catch (e) { next(e); }
}

async function deleteSlot(req, res, next) {
  try {
    await slotService.deleteSlot(req.params.slotId, req.params.venueId);
    res.json({ success: true, message: "Slot deleted successfully" });
  } catch (e) { next(e); }
}

module.exports = { createSlot, getSlots, getPublicSlots, updateSlot, toggleSlot, deleteSlot };