import api from "./api";

export const inquiryService = {
  submitPublic: (venueId, payload) => api.post(`/venues/${venueId}/inquiries`, payload),
  getAll: (venueId, params) => api.get(`/venues/${venueId}/inquiries`, { params }),
  getById: (venueId, inquiryId) => api.get(`/venues/${venueId}/inquiries/${inquiryId}`),
  updateStatus: (venueId, inquiryId, status) =>
    api.patch(`/venues/${venueId}/inquiries/${inquiryId}/status`, { status }),
  updateNotes: (venueId, inquiryId, notes) =>
    api.patch(`/venues/${venueId}/inquiries/${inquiryId}/notes`, { notes })
};