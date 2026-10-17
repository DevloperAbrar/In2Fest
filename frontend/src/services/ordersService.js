import api from "./api";

const b = (v) => `/venues/${v}/orders`;

// Vendor dashboard
export const ordersService = {
  summary: (v) => api.get(`${b(v)}/summary`),
  list: (v, params) => api.get(b(v), { params }),
  settings: (v) => api.get(`${b(v)}/settings`),
  saveSettings: (v, payload) => api.put(`${b(v)}/settings`, payload),
  setAccepting: (v, accepting) => api.post(`${b(v)}/accepting`, { accepting }),
  lookup: (v, code) => api.get(`${b(v)}/lookup`, { params: { code } }),
  edit: (v, id, payload) => api.patch(`${b(v)}/${id}`, payload),
  accept: (v, id, prep_minutes) => api.post(`${b(v)}/${id}/accept`, { prep_minutes }),
  eta: (v, id, prep_minutes) => api.post(`${b(v)}/${id}/eta`, { prep_minutes }),
  ready: (v, id) => api.post(`${b(v)}/${id}/ready`),
  cancel: (v, id, reason) => api.post(`${b(v)}/${id}/cancel`, { reason }),
  noShow: (v, id) => api.post(`${b(v)}/${id}/no-show`),
  fake: (v, id) => api.post(`${b(v)}/${id}/fake`),
  bill: (v, id) => api.post(`${b(v)}/${id}/bill`),
  complete: (v, id, payload) => api.post(`${b(v)}/${id}/complete`, payload),
  blocked: (v) => api.get(`${b(v)}/blocked`),
  unblock: (v, phone) => api.post(`${b(v)}/blocked/clear`, { phone })
};

// Public website (customer)
export const publicOrders = {
  config: (venueId) => api.get(`/public/orders/${venueId}/config`),
  place: (venueId, payload) => api.post(`/public/orders/${venueId}`, payload),
  track: (token) => api.get(`/public/orders/track/${token}`),
  cancel: (token) => api.post(`/public/orders/track/${token}/cancel`)
};