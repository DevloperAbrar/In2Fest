const { Client, Booking, Slot } = require("../../database/models");
const { Op } = require("sequelize");
const { AppError } = require("../../middleware/error.middleware");

async function createClient(req, res, next) {
  try {
    const client = await Client.create({ ...req.body, venue_id: req.params.venueId, source: "manual" });
    const withSlot = await Client.findOne({
      where: { id: client.id },
      include: [{ model: Slot, as: "slot" }]
    });
    res.status(201).json({ success: true, data: withSlot });
  } catch (error) {
    next(error);
  }
}

// A client = someone who has at least one booking. People without any booking
// (added manually earlier, or only sent an inquiry) are not listed.
async function getClients(req, res, next) {
  try {
    const venueId = req.params.venueId;

    const booked = await Booking.findAll({
      where: { venue_id: venueId, client_id: { [Op.ne]: null } },
      attributes: ["client_id"],
      group: ["client_id"],
      raw: true
    });
    const clientIds = booked.map((b) => b.client_id);

    if (clientIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const clients = await Client.findAll({
      where: { venue_id: venueId, id: { [Op.in]: clientIds } },
      include: [{ model: Slot, as: "slot" }],
      order: [["created_at", "DESC"]]
    });
    res.json({ success: true, data: clients });
  } catch (error) {
    next(error);
  }
}

async function getClient(req, res, next) {
  try {
    const client = await Client.findOne({
      where: { id: req.params.clientId, venue_id: req.params.venueId },
      include: [{ model: Booking, as: "bookings" }, { model: Slot, as: "slot" }]
    });
    if (!client) throw new AppError("Client not found", 404);
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
}

async function updateClient(req, res, next) {
  try {
    const client = await Client.findOne({ where: { id: req.params.clientId, venue_id: req.params.venueId } });
    if (!client) throw new AppError("Client not found", 404);

    const allowed = ["name", "phone", "email", "notes", "documents", "slot_id", "venue_type", "event_type", "guest_count"];
    allowed.forEach((f) => { if (req.body[f] !== undefined) client[f] = req.body[f]; });

    await client.save();
    const withSlot = await Client.findOne({
      where: { id: client.id },
      include: [{ model: Slot, as: "slot" }]
    });
    res.json({ success: true, data: withSlot });
  } catch (error) {
    next(error);
  }
}

/**
 * Blocks deletion if the client has any existing bookings, to avoid
 * orphaning booking/payment/invoice records. Owner must handle those
 * bookings first (cancel/reassign) before the client record can be removed.
 */
async function deleteClient(req, res, next) {
  try {
    const client = await Client.findOne({ where: { id: req.params.clientId, venue_id: req.params.venueId } });
    if (!client) throw new AppError("Client not found", 404);

    const bookingCount = await Booking.count({ where: { client_id: client.id } });
    if (bookingCount > 0) {
      throw new AppError(
        `This client has ${bookingCount} booking(s) linked to their record. Remove or reassign those bookings before deleting this client.`,
        409
      );
    }

    await client.destroy();
    res.json({ success: true, message: "Client deleted" });
  } catch (error) {
    next(error);
  }
}

module.exports = { createClient, getClients, getClient, updateClient, deleteClient };