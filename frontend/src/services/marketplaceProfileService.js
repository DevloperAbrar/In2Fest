import api from "./api";

export const marketplaceProfileService = {
  get: (venueId) => api.get(`/venues/${venueId}/marketplace-profile`),
  update: (venueId, payload) => api.put(`/venues/${venueId}/marketplace-profile`, payload),
  updateServiceAreas: (venueId, cities) =>
    api.put(`/venues/${venueId}/marketplace-profile/service-areas`, { cities }),
  getCompletion: (venueId) => api.get(`/venues/${venueId}/marketplace-profile/completion`)
};