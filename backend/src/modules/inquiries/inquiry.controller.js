const inquiryService = require("./inquiry.service");

async function createPublicInquiry(req, res, next) {
  try {
    const inquiry = await inquiryService.createPublicInquiry(req.params.venueId, req.body);
    res.status(201).json({ success: true, data: inquiry });
  } catch (error) {
    next(error);
  }
}

async function getInquiries(req, res, next) {
  try {
    const inquiries = await inquiryService.getInquiriesByVenue(req.params.venueId, req.query);
    res.json({ success: true, data: inquiries });
  } catch (error) {
    next(error);
  }
}

async function getInquiry(req, res, next) {
  try {
    const inquiry = await inquiryService.getInquiryById(req.params.inquiryId, req.params.venueId);
    res.json({ success: true, data: inquiry });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const inquiry = await inquiryService.updateInquiryStatus(
      req.params.inquiryId,
      req.params.venueId,
      req.body.status
    );
    res.json({ success: true, data: inquiry });
  } catch (error) {
    next(error);
  }
}

async function updateNotes(req, res, next) {
  try {
    const inquiry = await inquiryService.updateInternalNotes(
      req.params.inquiryId,
      req.params.venueId,
      req.body.notes
    );
    res.json({ success: true, data: inquiry });
  } catch (error) {
    next(error);
  }
}

async function createMarketplaceInquiry(req, res, next) {
  try {
    const inquiry = await inquiryService.createMarketplaceInquiry(req.params.venueId, req.body);
    res.status(201).json({ success: true, data: inquiry });
  } catch (error) {
    next(error);
  }
}

module.exports = { createPublicInquiry, getInquiries, getInquiry, updateStatus, updateNotes, createMarketplaceInquiry };