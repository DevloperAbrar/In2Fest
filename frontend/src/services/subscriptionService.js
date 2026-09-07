import api from "./api";

export const subscriptionService = {
  create: (venueId, planId) => api.post("/subscriptions", { venueId, planId }),
  getByVenue: (venueId) => api.get(`/subscriptions/${venueId}`),
  changePlan: (venueId, planId) => api.patch(`/subscriptions/${venueId}/change-plan`, { planId }),
  extendTrial: (venueId, extraDays) => api.patch(`/subscriptions/${venueId}/extend-trial`, { extraDays }),
  suspend: (venueId) => api.patch(`/subscriptions/${venueId}/suspend`),
  reactivate: (venueId) => api.patch(`/subscriptions/${venueId}/reactivate`)
};