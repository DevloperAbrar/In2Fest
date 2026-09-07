import api from "./api";

export const venueService = {
  create: (payload) => api.post("/venues", payload),
  getMyVenues: () => api.get("/venues/my"),
  getById: (id) => api.get(`/venues/${id}`),
  update: (id, payload) => api.patch(`/venues/${id}`, payload),
  uploadHeroImage: (id, formData) => api.post(`/venues/${id}/hero-image`, formData),
  addGalleryImages: (id, formData) => api.post(`/venues/${id}/gallery`, formData),
  uploadSectionImage: (id, formData) => api.post(`/venues/${id}/section-image`, formData),
  getPublicBySubdomain: (subdomain) => api.get(`/venues/public/${subdomain}`),

  deleteGalleryImage: (id, imageId) => api.delete(`/venues/${id}/gallery/${imageId}`),

  listAll: (params) => api.get("/venues", { params }),
  toggleActive: (id, is_active) => api.patch(`/venues/${id}/status`, { is_active }),
  remove: (id) => api.delete(`/venues/${id}`)
};