import api from "./api";

const b = (v) => `/venues/${v}/inventory`;

export const inventoryService = {
  overview: (v) => api.get(`${b(v)}/overview`),
  stock: (v) => api.get(`${b(v)}/stock`),
  exportStock: (v) => api.get(`${b(v)}/stock/export`, { responseType: "blob" }),
  adjust: (v, itemId, payload) => api.post(`${b(v)}/items/${itemId}/adjust`, payload),
  movements: (v, params) => api.get(`${b(v)}/movements`, { params }),

  suppliers: (v) => api.get(`${b(v)}/suppliers`),
  createSupplier: (v, payload) => api.post(`${b(v)}/suppliers`, payload),
  updateSupplier: (v, id, payload) => api.patch(`${b(v)}/suppliers/${id}`, payload),
  deleteSupplier: (v, id) => api.delete(`${b(v)}/suppliers/${id}`),

  purchases: (v) => api.get(`${b(v)}/purchases`),
  createPurchase: (v, payload) => api.post(`${b(v)}/purchases`, payload),
  payPurchase: (v, id, amount) => api.post(`${b(v)}/purchases/${id}/pay`, { amount }),
  cancelPurchase: (v, id) => api.delete(`${b(v)}/purchases/${id}`)
};