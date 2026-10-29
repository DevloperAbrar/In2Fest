import api from "./api";

const b = (v) => `/venues/${v}/staff`;

export const staffService = {
  list: (v, params) => api.get(b(v), { params }),
  create: (v, body) => api.post(b(v), body),
  update: (v, id, body) => api.patch(`${b(v)}/${id}`, body),
  remove: (v, id) => api.delete(`${b(v)}/${id}`),
  attendance: (v, date) => api.get(`${b(v)}/attendance`, { params: { date } }),
  markAttendance: (v, body) => api.put(`${b(v)}/attendance`, body),
  payroll: (v, month) => api.get(`${b(v)}/payroll`, { params: { month } }),
  staffMonth: (v, id, month) => api.get(`${b(v)}/${id}/month`, { params: { month } }),
  setAdjustment: (v, id, body) => api.put(`${b(v)}/${id}/adjustment`, body),
  pay: (v, id, body) => api.post(`${b(v)}/${id}/payments`, body),
  payAll: (v, body) => api.post(`${b(v)}/payroll/pay-all`, body),
  cancelPayment: (v, id, body) => api.post(`${b(v)}/payments/${id}/cancel`, body),
  receipt: (v, id) => api.get(`${b(v)}/payments/${id}/receipt`, { responseType: "blob" })
};