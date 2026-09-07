const venueService = require("./venue.service");
const { AppError } = require("../../middleware/error.middleware");

async function createVenue(req, res, next) {
  try {
    const venue = await venueService.createVenue({ ...req.body, owner_id: req.user.id });
    res.status(201).json({ success: true, data: venue });
  } catch (error) {
    next(error);
  }
}

async function getMyVenues(req, res, next) {
  try {
    const venues = await venueService.getVenuesByOwner(req.user.id);
    res.json({ success: true, data: venues });
  } catch (error) {
    next(error);
  }
}

async function getVenue(req, res, next) {
  try {
    const venue = await venueService.getVenueById(req.params.id);
    res.json({ success: true, data: venue });
  } catch (error) {
    next(error);
  }
}

async function updateVenue(req, res, next) {
  try {
    const venue = await venueService.updateVenue(req.params.id, req.user.id, req.body);
    res.json({ success: true, data: venue });
  } catch (error) {
    next(error);
  }
}

async function uploadHeroImage(req, res, next) {
  try {
    if (!req.file) throw new AppError("No file uploaded", 400);
    const venue = await venueService.uploadHeroImage(req.params.id, req.user.id, req.file);
    res.json({ success: true, data: venue });
  } catch (error) {
    next(error);
  }
}

async function addGalleryImages(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) throw new AppError("No files uploaded", 400);
    const venue = await venueService.addGalleryImages(req.params.id, req.user.id, req.files);
    res.json({ success: true, data: venue });
  } catch (error) {
    next(error);
  }
}

async function listAllVenues(req, res, next) {
  try {
    const venues = await venueService.listAllVenues(req.query);
    res.json({ success: true, data: venues });
  } catch (error) {
    next(error);
  }
}

async function toggleVenueActive(req, res, next) {
  try {
    const venue = await venueService.toggleVenueActive(req.params.id, req.body.is_active);
    res.json({ success: true, data: venue });
  } catch (error) {
    next(error);
  }
}

async function deleteVenue(req, res, next) {
  try {
    await venueService.deleteVenue(req.params.id);
    res.json({ success: true, message: "Venue deleted successfully" });
  } catch (error) {
    next(error);
  }
}

async function getPublicVenue(req, res, next) {
  try {
    const venue = await venueService.getPublicVenueBySubdomain(req.params.subdomain);
    res.json({ success: true, data: venue });
  } catch (error) {
    next(error);
  }
}

// Preview endpoint  - authenticated owner only, skips is_live check
async function previewVenue(req, res, next) {
  try {
    const venue = await venueService.getVenueBySubdomainForPreview(req.params.subdomain);
    // Ensure the requesting user actually owns this venue
    if (venue.owner_id !== req.user.id && req.user.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    res.json({ success: true, data: venue });
  } catch (error) {
    next(error);
  }
}

async function deleteGalleryImage(req, res, next) {
  try {
    const venue = await venueService.deleteGalleryImage(
      req.params.id,
      req.user.id,
      req.params.imageId
    );
    res.json({ success: true, data: venue });
  } catch (error) {
    next(error);
  }
}

async function uploadSectionImage(req, res, next) {
  try {
    if (!req.file) throw new AppError("No file uploaded", 400);
    const result = await venueService.uploadSectionImage(req.params.id, req.user.id, req.file);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createVenue,
  getMyVenues,
  getVenue,
  updateVenue,
  uploadHeroImage,
  addGalleryImages,
  listAllVenues,
  toggleVenueActive,
  deleteVenue,
  getPublicVenue,
  previewVenue,
  deleteGalleryImage,
  uploadSectionImage
};