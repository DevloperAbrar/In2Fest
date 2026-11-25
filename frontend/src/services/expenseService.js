import api from "./api";

const b = (v) => `/venues/${v}/expenses`;

export const expenseService = {
  meta: (v) => api.get(`${b(v)}/meta`),
  overview: (v, month) => api.get(`${b(v)}/overview`, { params: { month } }),

  entries: (v, params) => api.get(`${b(v)}/entries`, { params }),
  createEntry: (v, payload) => api.post(`${b(v)}/entries`, payload),
  updateEntry: (v, id, payload) => api.patch(`${b(v)}/entries/${id}`, payload),
  payEntry: (v, id, payload = {}) => api.post(`${b(v)}/entries/${id}/pay`, payload),
  deleteEntry: (v, id) => api.delete(`${b(v)}/entries/${id}`),
  exportCsv: (v, params) => api.get(`${b(v)}/export`, { params, responseType: "blob" }),

  recurring: (v) => api.get(`${b(v)}/recurring`),
  createRecurring: (v, payload) => api.post(`${b(v)}/recurring`, payload),
  updateRecurring: (v, id, payload) => api.patch(`${b(v)}/recurring/${id}`, payload),
  deleteRecurring: (v, id) => api.delete(`${b(v)}/recurring/${id}`),

  createCategory: (v, payload) => api.post(`${b(v)}/categories`, payload),
  updateCategory: (v, id, payload) => api.patch(`${b(v)}/categories/${id}`, payload),
  deleteCategory: (v, id) => api.delete(`${b(v)}/categories/${id}`)
};