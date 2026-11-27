import api from "./api";

const base = (venueId) => `/venues/${venueId}/addons`;

export const addonService = {
  // vendor
  list: (venueId) => api.get(base(venueId)),
  quote: (venueId, key, billingCycle) => api.get(`${base(venueId)}/${key}/quote`, { params: { billingCycle } }),
  order: (venueId, key, body) => api.post(`${base(venueId)}/${key}/order`, body),
  verify: (venueId, key, body) => api.post(`${base(venueId)}/${key}/verify`, body),

  // super admin
  adminList: () => api.get("/admin/addons"),
  adminPricing: (key, body) => api.put(`/admin/addons/${key}/pricing`, body),
  adminHolders: (key, params) => api.get(`/admin/addons/${key}/holders`, { params }),
  adminGrant: (body) => api.post("/admin/addons/grant", body),
  adminRevoke: (body) => api.post("/admin/addons/revoke", body),
  adminVenue: (venueId) => api.get(`/admin/addons/venue/${venueId}`)
};