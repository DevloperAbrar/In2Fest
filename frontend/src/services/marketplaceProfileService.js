import api from "./api";

export const marketplaceProfileService = {
  get: (venueId) => api.get(`/venues/${venueId}/marketplace-profile`),
  update: (venueId, payload) => api.put(`/venues/${venueId}/marketplace-profile`, payload),
  updateServiceAreas: (venueId, cities) =>
    api.put(`/venues/${venueId}/marketplace-profile/service-areas`, { cities }),
  getCompletion: (venueId) => api.get(`/venues/${venueId}/marketplace-profile/completion`),

  // Free listing hero image + photos (formData fields: heroImage / galleryImages)
  uploadHeroPhoto: (venueId, formData) =>
    api.post(`/venues/${venueId}/marketplace-profile/photos/hero`, formData),
  uploadGalleryPhotos: (venueId, formData) =>
    api.post(`/venues/${venueId}/marketplace-profile/photos/gallery`, formData),
  deleteGalleryPhoto: (venueId, imageId) =>
    api.delete(`/venues/${venueId}/marketplace-profile/photos/gallery/${imageId}`)
};