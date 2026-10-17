import api from "./api";

const b = (v) => `/venues/${v}/food`;

export const foodService = {
  saveSettings: (v, body) => api.put(`${b(v)}/settings`, body),

  dashboard: (v) => api.get(`${b(v)}/dashboard`),
  reports: (v, params) => api.get(`${b(v)}/reports`, { params }),
  exportReport: (v, params) => api.get(`${b(v)}/reports/export`, { params, responseType: "blob" }),

  categories: (v) => api.get(`${b(v)}/categories`),
  createCategory: (v, body) => api.post(`${b(v)}/categories`, body),
  updateCategory: (v, id, body) => api.patch(`${b(v)}/categories/${id}`, body),
  deleteCategory: (v, id) => api.delete(`${b(v)}/categories/${id}`),

  items: (v, params) => api.get(`${b(v)}/items`, { params }),
  createItem: (v, body) => api.post(`${b(v)}/items`, body),
  updateItem: (v, id, body) => api.patch(`${b(v)}/items/${id}`, body),
  setAvailability: (v, id, is_available) => api.patch(`${b(v)}/items/${id}/availability`, { is_available }),
  deleteItem: (v, id) => api.delete(`${b(v)}/items/${id}`),
  installStarter: (v) => api.post(`${b(v)}/items/starter-menu`),
  uploadPhoto: (v, id, file) => {
    const fd = new FormData();
    fd.append("photo", file);
    return api.post(`${b(v)}/items/${id}/photo`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },

  board: (v) => api.get(`${b(v)}/orders/board`),
  orders: (v, params) => api.get(`${b(v)}/orders`, { params }),
  preview: (v, body) => api.post(`${b(v)}/orders/preview`, body),
  createOrder: (v, body) => api.post(`${b(v)}/orders`, body),
  setStatus: (v, id, status) => api.patch(`${b(v)}/orders/${id}/status`, { status }),
  payOrder: (v, id, body) => api.post(`${b(v)}/orders/${id}/pay`, body),
  cancelOrder: (v, id, reason) => api.post(`${b(v)}/orders/${id}/cancel`, { reason }),
  roomTabs: (v) => api.get(`${b(v)}/room-tabs`),
  settleRoom: (v, room, mode) => api.post(`${b(v)}/room-tabs/settle`, { room, mode }),

  tables: (v) => api.get(`${b(v)}/tables`),
  createTables: (v, body) => api.post(`${b(v)}/tables`, body),
  updateTable: (v, id, body) => api.patch(`${b(v)}/tables/${id}`, body),
  deleteTable: (v, id) => api.delete(`${b(v)}/tables/${id}`),
  tableQr: (v, id, base) => api.get(`${b(v)}/tables/${id}/qr`, { params: { base }, responseType: "blob" }),

  units: (v) => api.get(`${b(v)}/units`),
  createUnit: (v, body) => api.post(`${b(v)}/units`, body),
  updateUnit: (v, id, body) => api.patch(`${b(v)}/units/${id}`, body),
  deleteUnit: (v, id) => api.delete(`${b(v)}/units/${id}`),

  ingredients: (v) => api.get(`${b(v)}/ingredients`),
  createIngredient: (v, body) => api.post(`${b(v)}/ingredients`, body),
  updateIngredient: (v, id, body) => api.patch(`${b(v)}/ingredients/${id}`, body),
  deleteIngredient: (v, id) => api.delete(`${b(v)}/ingredients/${id}`),
  adjustStock: (v, id, body) => api.post(`${b(v)}/ingredients/${id}/adjust`, body),

  customers: (v, params) => api.get(`${b(v)}/customers`, { params }),
  customerMessage: (v, id, type) => api.get(`${b(v)}/customers/${id}/message`, { params: { type } })
};