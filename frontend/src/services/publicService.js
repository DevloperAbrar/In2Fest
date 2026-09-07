import api from "./api";

export const publicService = {
  verifyInvoice: (invoiceId) => api.get(`/public/invoices/${invoiceId}/verify`)
};