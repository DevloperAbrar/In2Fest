import api from "./api";

export const clientService = {
  getAll: (venueId) => api.get(`/venues/${venueId}/clients`),
  getById: (venueId, clientId) => api.get(`/venues/${venueId}/clients/${clientId}`),
  create: (venueId, payload) => api.post(`/venues/${venueId}/clients`, payload),
  update: (venueId, clientId, payload) => api.patch(`/venues/${venueId}/clients/${clientId}`, payload),
  delete: (venueId, clientId) => api.delete(`/venues/${venueId}/clients/${clientId}`)
};