const express = require("express");
const invoiceController = require("./invoice.controller");
const quotationController = require("./quotation.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { ServiceItem } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");
const { requirePlanFeature } = require("../../middleware/planFeature.middleware");
const { requireTeamPermission } = require("../../middleware/teamPermission.middleware");

const router = express.Router({ mergeParams: true });

router.use(
  authenticate,
  requireVenueOwnership,
  requireRole("venue_owner", "team_member"),
  requirePlanFeature("billing"),
  requireTeamPermission("billing")
);

// Invoices & Quotations (shared creation endpoint, type field distinguishes them)
router.post("/invoices", invoiceController.createInvoice);
router.get("/invoices", invoiceController.getInvoices);
router.get("/invoices/:invoiceId", invoiceController.getInvoice);
router.patch("/invoices/:invoiceId", invoiceController.updateInvoice);
router.delete("/invoices/:invoiceId", invoiceController.deleteInvoice);
router.post("/invoices/:invoiceId/share", invoiceController.shareViaWhatsapp);

router.get("/quotations", quotationController.getQuotations);
router.post("/quotations/:quotationId/convert", quotationController.convertQuotationToInvoice);

// Service Item Catalog
router.post("/service-items", async (req, res, next) => {
  try {
    const item = await ServiceItem.create({ ...req.body, venue_id: req.params.venueId });
    res.status(201).json({ success: true, data: item });
  } catch (error) { next(error); }
});

router.get("/service-items", async (req, res, next) => {
  try {
    const items = await ServiceItem.findAll({ where: { venue_id: req.params.venueId } });
    res.json({ success: true, data: items });
  } catch (error) { next(error); }
});

router.patch("/service-items/:itemId", async (req, res, next) => {
  try {
    const item = await ServiceItem.findOne({ where: { id: req.params.itemId, venue_id: req.params.venueId } });
    if (!item) throw new AppError("Service item not found", 404);
    Object.assign(item, req.body);
    await item.save();
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
});

router.delete("/service-items/:itemId", async (req, res, next) => {
  try {
    const item = await ServiceItem.findOne({ where: { id: req.params.itemId, venue_id: req.params.venueId } });
    if (!item) throw new AppError("Service item not found", 404);
    await item.destroy();
    res.json({ success: true, message: "Service item deleted" });
  } catch (error) { next(error); }
});

module.exports = router;