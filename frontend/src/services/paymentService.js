import api from "./api";

export const paymentService = {
  // type: optional, "renewal" renews the current plan (extends from current_period_end)
  // useCredit: optional boolean, false = don't deduct referral credit (default: deduct)
  createOrder: (venueId, planId, returnPath, billingCycle = "monthly", type, useCredit) =>
    api.post("/payments/create-order", {
      venueId,
      planId,
      returnPath,
      billingCycle,
      ...(type ? { type } : {}),
      ...(useCredit !== undefined ? { useCredit } : {})
    }),

  verifyPayment: (payload) => api.post("/payments/verify", payload),

  recordManual: (payload) => api.post("/payments/manual", payload),

  getAll: (venueId) => api.get("/payments", { params: { venueId } }),

  getQuote: (venueId, planId, billingCycle, useCredit) =>
    api.get("/payments/quote", {
      params: {
        venueId,
        planId,
        billingCycle,
        ...(useCredit !== undefined ? { useCredit } : {})
      }
    })
};