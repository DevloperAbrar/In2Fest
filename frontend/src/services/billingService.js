import api from "./api";

export const billingService = {
  createInvoice: (venueId, payload) => api.post(`/venues/${venueId}/billing/invoices`, payload),
  updateInvoice: (venueId, invoiceId, payload) => api.patch(`/venues/${venueId}/billing/invoices/${invoiceId}`, payload),
  deleteInvoice: (venueId, invoiceId) => api.delete(`/venues/${venueId}/billing/invoices/${invoiceId}`),
  getInvoices: (venueId) => api.get(`/venues/${venueId}/billing/invoices`),
  getInvoice: (venueId, invoiceId) => api.get(`/venues/${venueId}/billing/invoices/${invoiceId}`),
  shareInvoice: (venueId, invoiceId) => api.post(`/venues/${venueId}/billing/invoices/${invoiceId}/share`),

  getQuotations: (venueId) => api.get(`/venues/${venueId}/billing/quotations`),
  convertQuotation: (venueId, quotationId) =>
    api.post(`/venues/${venueId}/billing/quotations/${quotationId}/convert`),

  getServiceItems: (venueId) => api.get(`/venues/${venueId}/billing/service-items`),
  createServiceItem: (venueId, payload) => api.post(`/venues/${venueId}/billing/service-items`, payload),
  updateServiceItem: (venueId, itemId, payload) =>
    api.patch(`/venues/${venueId}/billing/service-items/${itemId}`, payload),
  deleteServiceItem: (venueId, itemId) => api.delete(`/venues/${venueId}/billing/service-items/${itemId}`)
};