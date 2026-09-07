import api from "./api";

export const bookingService = {
  getAll: (venueId, params) => api.get(`/venues/${venueId}/bookings`, { params }),
  getById: (venueId, bookingId) => api.get(`/venues/${venueId}/bookings/${bookingId}`),
  create: (venueId, payload) => api.post(`/venues/${venueId}/bookings`, payload),
  convertFromInquiry: (venueId, inquiryId, payload) =>
    api.post(`/venues/${venueId}/bookings/from-inquiry/${inquiryId}`, payload),
  updateStatus: (venueId, bookingId, status) =>
    api.patch(`/venues/${venueId}/bookings/${bookingId}/status`, { status }),
  update: (venueId, bookingId, payload) =>
    api.patch(`/venues/${venueId}/bookings/${bookingId}`, payload),
  delete: (venueId, bookingId) => api.delete(`/venues/${venueId}/bookings/${bookingId}`),
  checkAvailability: (venueId, slotId, eventDate, venueTypes = []) =>
    api.get(`/venues/${venueId}/bookings/availability`, {
      params: { slotId, eventDate, venueTypes: venueTypes.join(",") }
    }),
  addPayment: (venueId, bookingId, payload) =>
    api.post(`/venues/${venueId}/bookings/${bookingId}/payments`, payload),
  getPayments: (venueId, bookingId) => api.get(`/venues/${venueId}/bookings/${bookingId}/payments`)
};