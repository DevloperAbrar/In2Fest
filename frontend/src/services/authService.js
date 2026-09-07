import api from "./api";

export const authService = {
  adminLogin: (email, password) => api.post("/auth/admin/login", { email, password }),
  getGoogleLoginUrl: () => `${import.meta.env.VITE_API_URL }/auth/google`,
  getCurrentUser: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout")
};