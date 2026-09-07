import api from "./api";

export const paymentService = {
  createOrder: (venueId, planId) => api.post("/payments/create-order", { venueId, planId }),
  verifyPayment: (payload) => api.post("/payments/verify", payload),
  recordManual: (payload) => api.post("/payments/manual", payload),
  getAll: (venueId) => api.get("/payments", { params: { venueId } })
};