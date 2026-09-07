import api from "./api";

export const planService = {
  getAll: () => api.get("/plans"),
  getById: (id) => api.get(`/plans/${id}`),
  create: (payload) => api.post("/plans", payload),
  update: (id, payload) => api.patch(`/plans/${id}`, payload),
  remove: (id) => api.delete(`/plans/${id}`)
};