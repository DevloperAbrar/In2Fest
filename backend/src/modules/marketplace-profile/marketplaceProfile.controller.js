const marketplaceProfileService = require("./marketplaceProfile.service");

async function getProfile(req, res, next) {
  try {
    const result = await marketplaceProfileService.getProfile(req.params.venueId, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const result = await marketplaceProfileService.updateProfile(req.params.venueId, req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function updateServiceAreas(req, res, next) {
  try {
    const cities = await marketplaceProfileService.updateServiceAreas(
      req.params.venueId,
      req.user.id,
      req.body.cities
    );
    res.json({ success: true, data: cities });
  } catch (error) {
    next(error);
  }
}

async function getCompletion(req, res, next) {
  try {
    const completion = await marketplaceProfileService.getCompletion(req.params.venueId, req.user.id);
    res.json({ success: true, data: completion });
  } catch (error) {
    next(error);
  }
}

async function uploadHeroPhoto(req, res, next) {
  try {
    const result = await marketplaceProfileService.uploadHeroPhoto(req.params.venueId, req.user.id, req.file);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function addGalleryPhotos(req, res, next) {
  try {
    const result = await marketplaceProfileService.addGalleryPhotos(req.params.venueId, req.user.id, req.files);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function deleteGalleryPhoto(req, res, next) {
  try {
    const result = await marketplaceProfileService.deleteGalleryPhoto(
      req.params.venueId,
      req.user.id,
      req.params.imageId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updateServiceAreas,
  getCompletion,
  uploadHeroPhoto,
  addGalleryPhotos,
  deleteGalleryPhoto
};