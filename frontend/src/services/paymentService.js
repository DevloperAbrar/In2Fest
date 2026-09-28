import api from "./api";

export const paymentService = {
  createOrder: (venueId, planId, returnPath, billingCycle = "monthly") =>
    api.post("/payments/create-order", { venueId, planId, returnPath, billingCycle }),

  verifyPayment: (payload) => api.post("/payments/verify", payload),

  recordManual: (payload) => api.post("/payments/manual", payload),

  getAll: (venueId) => api.get("/payments", { params: { venueId } }),

  getQuote: (venueId, planId, billingCycle) =>
    api.get("/payments/quote", { params: { venueId, planId, billingCycle } })
};