import axiosInstance from "../lib/axiosInstance";

const base = "/admin/demo";
const data = (r) => r.data.data;

export const demoService = {
  list: () => axiosInstance.get(base).then(data),
  create: (body) => axiosInstance.post(base, body).then(data),
  reset: (id) => axiosInstance.post(`${base}/${id}/reset`).then(data),
  extend: (id, days) => axiosInstance.post(`${base}/${id}/extend`, { days }).then(data),
  revoke: (id) => axiosInstance.post(`${base}/${id}/revoke`).then(data),
  password: (id, password) => axiosInstance.post(`${base}/${id}/password`, { password }).then(data),
  remove: (id) => axiosInstance.delete(`${base}/${id}`).then(data)
};