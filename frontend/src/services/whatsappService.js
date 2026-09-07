import api from "./api";

export const whatsappService = {
  sendDirect: (payload) => api.post("/whatsapp/send", payload),
  sendBulk: (payload) => api.post("/whatsapp/send-bulk", payload),
  getHistory: (venueId) => api.get("/whatsapp/history", { params: { venueId } }),
  getTemplates: () => api.get("/whatsapp/templates"),
  createTemplate: (payload) => api.post("/whatsapp/templates", payload),
  updateTemplate: (id, payload) => api.patch(`/whatsapp/templates/${id}`, payload)
};