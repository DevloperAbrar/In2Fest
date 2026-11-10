import api from "./api";

export const planService = {
  getAll: () => api.get("/plans"),
  getById: (id) => api.get(`/plans/${id}`),
  create: (payload) => api.post("/plans", payload),
  update: (id, payload) => api.patch(`/plans/${id}`, payload),
  // visible = false hides the plan from NEW vendors. Vendors already on it are not affected.
  setVisibility: (id, visible) => api.patch(`/plans/${id}/visibility`, { visible }),
  remove: (id) => api.delete(`/plans/${id}`)
};