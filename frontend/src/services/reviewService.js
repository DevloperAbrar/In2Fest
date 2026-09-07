import api from "./api";

export const reviewService = {
  getByVenue: (venueId) => api.get(`/reviews/venue/${venueId}`),
  getOwnerByVenue: (venueId) => api.get(`/reviews/owner/${venueId}`),
  reply: (reviewId, replyText) => api.post(`/reviews/${reviewId}/reply`, { reply_text: replyText }),
  ownerApprove: (reviewId) => api.put(`/reviews/${reviewId}/owner-approve`),
  ownerDelete: (reviewId) => api.delete(`/reviews/${reviewId}/owner`),

  // Reviews this vendor has given to OTHER venues
  getGiven: () => api.get("/reviews/given"),
  updateGiven: (reviewId, payload) => api.put(`/reviews/${reviewId}/given`, payload),
  deleteGiven: (reviewId) => api.delete(`/reviews/${reviewId}/given`)
};