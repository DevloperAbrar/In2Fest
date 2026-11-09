import api from "./api";

const b = (v) => `/venues/${v}/library`;
const blob = { responseType: "blob" };
const form = (key, file) => {
  const fd = new FormData();
  fd.append(key, file);
  return fd;
};
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

export const libraryService = {
  dashboard: (v) => api.get(`${b(v)}/dashboard`),
  getSettings: (v) => api.get(`${b(v)}/settings`),
  saveSettings: (v, body) => api.put(`${b(v)}/settings`, body),
  regenerateQr: (v) => api.post(`${b(v)}/settings/regenerate-qr`),
  qrPng: (v) => api.get(`${b(v)}/attendance/qr.png`, blob),
  posterPdf: (v) => api.get(`${b(v)}/attendance/poster.pdf`, blob),

  listHalls: (v, all = false) => api.get(`${b(v)}/halls`, { params: { all } }),
  createHall: (v, body) => api.post(`${b(v)}/halls`, body),
  updateHall: (v, id, body) => api.patch(`${b(v)}/halls/${id}`, body),
  deleteHall: (v, id) => api.delete(`${b(v)}/halls/${id}`),
  seatMap: (v, id, shiftId) => api.get(`${b(v)}/halls/${id}/seatmap`, { params: { shift_id: shiftId || undefined } }),

  listShifts: (v, all = false) => api.get(`${b(v)}/shifts`, { params: { all } }),
  createShift: (v, body) => api.post(`${b(v)}/shifts`, body),
  updateShift: (v, id, body) => api.patch(`${b(v)}/shifts/${id}`, body),
  deleteShift: (v, id) => api.delete(`${b(v)}/shifts/${id}`),

  enroll: (v, body) => api.post(`${b(v)}/students`, body),
  getStudent: (v, id) => api.get(`${b(v)}/students/${id}`),
  updateStudent: (v, id, body) => api.patch(`${b(v)}/students/${id}`, body),
  uploadPhoto: (v, id, file) => api.post(`${b(v)}/students/${id}/photo`, form("photo", file), multipart),
  renew: (v, id, body) => api.post(`${b(v)}/students/${id}/renew`, body),
  move: (v, id, body) => api.post(`${b(v)}/students/${id}/move`, body),
  freeze: (v, id) => api.post(`${b(v)}/students/${id}/freeze`),
  unfreeze: (v, id) => api.post(`${b(v)}/students/${id}/unfreeze`),
  leave: (v, id) => api.post(`${b(v)}/students/${id}/leave`),
  archive: (v, id) => api.delete(`${b(v)}/students/${id}`),
  deletePermanent: (v, id, confirm) => api.delete(`${b(v)}/students/${id}/permanent`, { params: { confirm } }),
  revealAadhaar: (v, id) => api.get(`${b(v)}/students/${id}/aadhaar`),
  card: (v, id) => api.get(`${b(v)}/students/${id}/card`, blob),
  exportStudents: (v, params) => api.get(`${b(v)}/students/export`, { params, ...blob }),
  studentAttendance: (v, id, month) => api.get(`${b(v)}/students/${id}/attendance`, { params: { month } }),

  recordPayment: (v, id, body) => api.post(`${b(v)}/students/${id}/payments`, body),
  voidPayment: (v, id, reason) => api.post(`${b(v)}/payments/${id}/void`, { reason }),
  receipt: (v, id) => api.get(`${b(v)}/payments/${id}/receipt`, blob),

  markAttendance: (v, body) => api.post(`${b(v)}/attendance/mark`, body),
  markAll: (v, body) => api.post(`${b(v)}/attendance/mark-all`, body),
  checkout: (v, body) => api.post(`${b(v)}/attendance/checkout`, body),
  searchStudents: (v, q) => api.get(`${b(v)}/students`, { params: { q, status: "active", limit: 6 } }),
  importStudents: (v, rows) => api.post(`${b(v)}/students/import`, { rows }),

  createBook: (v, body) => api.post(`${b(v)}/books`, body),
  updateBook: (v, id, body) => api.patch(`${b(v)}/books/${id}`, body),
  deleteBook: (v, id) => api.delete(`${b(v)}/books/${id}`),
  importBooks: (v, rows) => api.post(`${b(v)}/books/import`, { rows }),
  issueBook: (v, bookId, body) => api.post(`${b(v)}/books/${bookId}/issue`, body),
  returnLoan: (v, id, body) => api.post(`${b(v)}/loans/${id}/return`, body),
  renewLoan: (v, id) => api.post(`${b(v)}/loans/${id}/renew`),
  lostLoan: (v, id, body) => api.post(`${b(v)}/loans/${id}/lost`, body),
  collectFine: (v, id, body) => api.post(`${b(v)}/loans/${id}/fine`, body),
  waiveFine: (v, id) => api.post(`${b(v)}/loans/${id}/waive`),

  markReminders: (v, body) => api.post(`${b(v)}/reminders/mark`, body),
};