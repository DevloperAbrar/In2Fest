const { Slot, Venue } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { recalculateSetupChecklist } = require("../venues/venue.service");

const TYPE_FIELDS = {
  time_slot: ["name", "start_time", "end_time", "base_price", "weekend_price", "days_of_operation"],
  full_day:  ["name", "base_price", "weekend_price", "days_of_operation"],
  hourly:    ["name", "price_per_hour", "min_hours", "max_hours", "days_of_operation"],
  package:   ["name", "base_price", "duration_label", "description", "inclusions"]
};

const ALL_TYPED_FIELDS = [
  "start_time", "end_time", "base_price", "weekend_price",
  "price_per_hour", "min_hours", "max_hours",
  "duration_label", "description", "inclusions"
];

function buildPayload(raw) {
  const type = raw.pricing_type || "time_slot";
  const allowed = TYPE_FIELDS[type] || TYPE_FIELDS.time_slot;

  const payload = { pricing_type: type, name: raw.name };

  if (raw.days_of_operation !== undefined) {
    payload.days_of_operation = raw.days_of_operation;
  }

  ALL_TYPED_FIELDS.forEach((field) => {
    if (allowed.includes(field)) {
      const val = raw[field];
      payload[field] = (val === "" || val === undefined) ? null : val;
    } else {
      payload[field] = null;
    }
  });

  return payload;
}

async function createSlot(venueId, rawPayload) {
  const data = buildPayload(rawPayload);
  const slot = await Slot.create({ venue_id: venueId, ...data });

  const venue = await Venue.findByPk(venueId);
  if (venue) await recalculateSetupChecklist(venue);

  return slot;
}

async function getSlotsByVenue(venueId, activeOnly = false) {
  const where = { venue_id: venueId };
  if (activeOnly) where.is_active = true;
  return Slot.findAll({ where, order: [["created_at", "ASC"]] });
}

async function updateSlot(slotId, venueId, rawPayload) {
  const slot = await Slot.findOne({ where: { id: slotId, venue_id: venueId } });
  if (!slot) throw new AppError("Slot not found", 404);

  const data = buildPayload({ ...slot.toJSON(), ...rawPayload });
  Object.assign(slot, data);
  if (rawPayload.is_active !== undefined) slot.is_active = rawPayload.is_active;
  await slot.save();

  return slot;
}

async function deleteSlot(slotId, venueId) {
  const slot = await Slot.findOne({ where: { id: slotId, venue_id: venueId } });
  if (!slot) throw new AppError("Slot not found", 404);
  await slot.destroy();

  const venue = await Venue.findByPk(venueId);
  if (venue) await recalculateSetupChecklist(venue);

  return true;
}

module.exports = { createSlot, getSlotsByVenue, updateSlot, deleteSlot };