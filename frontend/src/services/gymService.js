import api from "./api";

const b = (v) => `/venues/${v}/gym`;

export const gymService = {
  dashboard: (v) => api.get(`${b(v)}/dashboard`),
  getSettings: (v) => api.get(`${b(v)}/settings`),
  saveSettings: (v, body) => api.put(`${b(v)}/settings`, body),
  uploadLogo: (v, file) => {
    const fd = new FormData();
    fd.append("logo", file);
    return api.post(`${b(v)}/logo`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
  removeLogo: (v) => api.delete(`${b(v)}/logo`),

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
  updateLead: (v, id, body) => api.patch(`${b(v)}/leads/${id}`, body),
  createExercise: (v, body) => api.post(`${b(v)}/exercises`, body),

  // WhatsApp message centre
  msgTemplates: (v) => api.get(`${b(v)}/messages/templates`),
  msgCreateTemplate: (v, body) => api.post(`${b(v)}/messages/templates`, body),
  msgUpdateTemplate: (v, id, body) => api.patch(`${b(v)}/messages/templates/${id}`, body),
  msgDeleteTemplate: (v, id) => api.delete(`${b(v)}/messages/templates/${id}`),
  msgSaveSystem: (v, key, body) => api.put(`${b(v)}/messages/system/${key}`, { body }),
  msgResetSystem: (v, key) => api.delete(`${b(v)}/messages/system/${key}`),
  msgSegments: (v) => api.get(`${b(v)}/messages/segments`),
  msgAudience: (v, params) => api.get(`${b(v)}/messages/audience`, { params }),
  msgSent: (v, body) => api.post(`${b(v)}/messages/sent`, body),

  // supplement store
  storeGet: (v, path, params) => api.get(`${b(v)}/store${path}`, { params }),
  storePost: (v, path, body) => api.post(`${b(v)}/store${path}`, body),
  storePatch: (v, path, body) => api.patch(`${b(v)}/store${path}`, body),
  storePut: (v, path, body) => api.put(`${b(v)}/store${path}`, body),
  storeDelete: (v, path) => api.delete(`${b(v)}/store${path}`),
  storeUpload: (v, file) => {
    const fd = new FormData();
    fd.append("image", file);
    return api.post(`${b(v)}/store/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
  storeInvoice: (v, id) => api.get(`${b(v)}/store/sales/${id}/invoice`, { responseType: "blob" })
};