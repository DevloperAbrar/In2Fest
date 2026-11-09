import api from "./api";

export const contactMessageService = {
  updateStatus: (id, status) => api.put(`/admin/contact-messages/${id}`, { status }),
  remove: (id) => api.delete(`/admin/contact-messages/${id}`)
};