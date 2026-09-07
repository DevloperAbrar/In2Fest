const { sendWhatsApp } = require("./whatsapp.service");
const { WhatsappMessage, WhatsappTemplate, Venue } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { Op } = require("sequelize");

async function sendDirectMessage(req, res, next) {
  try {
    const { venueId, phone, message, scheduledFor } = req.body;
    const result = await sendWhatsApp({
      venueId,
      recipientPhone: phone,
      triggerType: "manual",
      variables: {},
      scheduledFor
    });

    if (result) result.body = message || result.body;
    if (result && message) { await result.save(); }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function sendBulkMessage(req, res, next) {
  try {
    const { filter, message, scheduledFor } = req.body;

    const where = {};
    if (filter?.city) where.city = filter.city;
    if (filter?.subscriptionStatus) where["$subscription.status$"] = filter.subscriptionStatus;

    const venues = await Venue.findAll({
      where,
      include: [{ association: "subscription" }]
    });

    const results = [];
    for (const venue of venues) {
      const result = await sendWhatsApp({
        venueId: venue.id,
        recipientPhone: venue.phone,
        triggerType: "bulk",
        variables: { hallName: venue.hall_name },
        scheduledFor
      });
      if (result && message) {
        result.body = message;
        await result.save();
      }
      results.push(result);
    }

    res.status(201).json({ success: true, data: { sentCount: results.length } });
  } catch (error) {
    next(error);
  }
}

async function getMessageHistory(req, res, next) {
  try {
    const { venueId } = req.query;
    const where = venueId ? { venue_id: venueId } : {};
    const messages = await WhatsappMessage.findAll({ where, order: [["created_at", "DESC"]], limit: 200 });
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
}

async function createTemplate(req, res, next) {
  try {
    const template = await WhatsappTemplate.create(req.body);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
}

async function getTemplates(req, res, next) {
  try {
    const templates = await WhatsappTemplate.findAll();
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
}

async function updateTemplate(req, res, next) {
  try {
    const template = await WhatsappTemplate.findByPk(req.params.id);
    if (!template) throw new AppError("Template not found", 404);
    Object.assign(template, req.body);
    await template.save();
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendDirectMessage,
  sendBulkMessage,
  getMessageHistory,
  createTemplate,
  getTemplates,
  updateTemplate
};