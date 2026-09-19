import api from "./api";

export const adminDiscoveryService = {
  getFeaturedVendors: () => api.get("/admin/discovery/featured-vendors"),
  setFeaturedVendors: (venueIds) => api.put("/admin/discovery/featured-vendors", { venue_ids: venueIds }),
  setVenueBadges: (venueId, badges) => api.put(`/admin/discovery/venues/${venueId}/badges`, badges),

  listCities: () => api.get("/admin/discovery/cities"),
  createCity: (payload) => api.post("/admin/discovery/cities", payload),
  updateCity: (cityId, payload) => api.put(`/admin/discovery/cities/${cityId}`, payload),

  // City requests ("Notify me")
  updateCityRequest: (id, status) => api.put(`/admin/discovery/city-requests/${id}`, { status }),
  bulkUpdateCityRequests: (cityKey, status) =>
    api.put("/admin/discovery/city-requests/bulk-status", { city_key: cityKey, status }),
  deleteCityRequest: (id) => api.delete(`/admin/discovery/city-requests/${id}`),

  // Category CRUD
  listAllCategories: () => api.get("/admin/discovery/categories"),
  createCategory: (payload) => api.post("/admin/discovery/categories", payload),
  updateCategory: (categoryId, payload) => api.put(`/admin/discovery/categories/${categoryId}`, payload),
  deleteCategory: (categoryId) => api.delete(`/admin/discovery/categories/${categoryId}`),

  getAnalytics: () => api.get("/admin/discovery/analytics"),

  // Reviews
  getPendingReviews: () => api.get("/reviews/admin/pending"),
  approveReview: (id) => api.put(`/reviews/admin/${id}/approve`),
  rejectReview: (id) => api.put(`/reviews/admin/${id}/reject`),

  // Free listings
  getAllListings: (status) => api.get("/listing/admin/all", { params: status ? { status } : {} }),
  approveListing: (id) => api.put(`/listing/admin/${id}/approve`),
  rejectListing: (id) => api.put(`/listing/admin/${id}/reject`),
  sendUpgradeLink: (id) => api.post(`/listing/admin/${id}/send-upgrade-link`)
};