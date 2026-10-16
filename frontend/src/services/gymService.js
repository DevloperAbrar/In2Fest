import api from "./api";

const b = (v) => `/venues/${v}/gym`;

export const gymService = {
  dashboard: (v) => api.get(`${b(v)}/dashboard`),
  getSettings: (v) => api.get(`${b(v)}/settings`),
  saveSettings: (v, body) => api.put(`${b(v)}/settings`, body),

  listPlans: (v, all = false) => api.get(`${b(v)}/plans`, { params: { all } }),
  createPlan: (v, body) => api.post(`${b(v)}/plans`, body),
  updatePlan: (v, id, body) => api.patch(`${b(v)}/plans/${id}`, body),
  deletePlan: (v, id) => api.delete(`${b(v)}/plans/${id}`),

  enroll: (v, body) => api.post(`${b(v)}/members`, body),
  updateMember: (v, id, body) => api.patch(`${b(v)}/members/${id}`, body),
  archiveMember: (v, id) => api.delete(`${b(v)}/members/${id}`),
  uploadPhoto: (v, id, file) => {
    const fd = new FormData();
    fd.append("photo", file);
    return api.post(`${b(v)}/members/${id}/photo`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
  renew: (v, id, body) => api.post(`${b(v)}/members/${id}/renew`, body),
  freeze: (v, id, body) => api.post(`${b(v)}/members/${id}/freeze`, body),
  unfreeze: (v, id) => api.post(`${b(v)}/members/${id}/unfreeze`),
  recordPayment: (v, id, body) => api.post(`${b(v)}/members/${id}/payments`, body),
  paymentLink: (v, id, body) => api.post(`${b(v)}/members/${id}/payment-link`, body),
  message: (v, id, params) => api.get(`${b(v)}/members/${id}/message`, { params }),
  exportMembers: (v, params) => api.get(`${b(v)}/members/export`, { params, responseType: "blob" }),

  confirmPayment: (v, id, body = {}) => api.post(`${b(v)}/payments/${id}/confirm`, body),
  cancelPayment: (v, id) => api.post(`${b(v)}/payments/${id}/cancel`),
  refreshPayment: (v, id) => api.post(`${b(v)}/payments/${id}/refresh`),
  receiptPdf: (v, id) => api.get(`${b(v)}/payments/${id}/receipt`, { responseType: "blob" }),
  memberCard: (v, id) => api.get(`${b(v)}/members/${id}/card`, { responseType: "blob" }),

  listWorkouts: (v, params) => api.get(`${b(v)}/workout-plans`, { params }),
  getWorkout: (v, id) => api.get(`${b(v)}/workout-plans/${id}`),
  createWorkout: (v, body) => api.post(`${b(v)}/workout-plans`, body),
  updateWorkout: (v, id, body) => api.patch(`${b(v)}/workout-plans/${id}`, body),
  deleteWorkout: (v, id) => api.delete(`${b(v)}/workout-plans/${id}`),
  assignWorkout: (v, id, body) => api.post(`${b(v)}/workout-plans/${id}/assign`, body),
  installStarters: (v) => api.post(`${b(v)}/workout-plans/starter-templates`),

  listLeads: (v, params) => api.get(`${b(v)}/leads`, { params }),
  updateLead: (v, id, body) => api.patch(`${b(v)}/leads/${id}`, body)
};