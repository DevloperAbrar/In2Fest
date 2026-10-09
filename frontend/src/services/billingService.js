import api from "./api";

export const billingService = {
  createInvoice: (venueId, payload) => api.post(`/venues/${venueId}/billing/invoices`, payload),
  updateInvoice: (venueId, invoiceId, payload) => api.patch(`/venues/${venueId}/billing/invoices/${invoiceId}`, payload),
  deleteInvoice: (venueId, invoiceId) => api.delete(`/venues/${venueId}/billing/invoices/${invoiceId}`),
  getInvoices: (venueId, params) => api.get(`/venues/${venueId}/billing/invoices`, { params }),
  getInvoice: (venueId, invoiceId) => api.get(`/venues/${venueId}/billing/invoices/${invoiceId}`),
  shareInvoice: (venueId, invoiceId) => api.post(`/venues/${venueId}/billing/invoices/${invoiceId}/share`),

  // { amount, method: "cash|upi|card|bank_transfer|cheque|other", reference?, note?, paid_at? }
  recordPayment: (venueId, invoiceId, payload) =>
    api.post(`/venues/${venueId}/billing/invoices/${invoiceId}/payments`, payload),

  getQuotations: (venueId) => api.get(`/venues/${venueId}/billing/quotations`),
  convertQuotation: (venueId, quotationId, payload) =>
    api.post(`/venues/${venueId}/billing/quotations/${quotationId}/convert`, payload || {}),

  getServiceItems: (venueId, params) => api.get(`/venues/${venueId}/billing/service-items`, { params }),
  createServiceItem: (venueId, payload) => api.post(`/venues/${venueId}/billing/service-items`, payload),
  updateServiceItem: (venueId, itemId, payload) =>
    api.patch(`/venues/${venueId}/billing/service-items/${itemId}`, payload),
  deleteServiceItem: (venueId, itemId) => api.delete(`/venues/${venueId}/billing/service-items/${itemId}`)
};