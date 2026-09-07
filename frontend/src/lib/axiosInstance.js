import axios from "axios";
import { API_BASE_URL } from "./constants";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const errorCode = error.response?.data?.errors?.code;

    // Deactivation is not a token-expiry problem  - never attempt a refresh
    // for this, just send the user straight to a clear "deactivated" screen.
    if (
      error.response?.status === 403 &&
      (errorCode === "ACCOUNT_DEACTIVATED" || errorCode === "VENUE_DEACTIVATED")
    ) {
      const wasTeamMember = localStorage.getItem("authRole") === "team_member";
      localStorage.removeItem("accessToken");
      localStorage.removeItem("authRole");
      const message = error.response.data.message;
      window.location.href = `/account-deactivated?msg=${encodeURIComponent(message)}&role=${wasTeamMember ? "team_member" : "owner"}`;
      return new Promise(() => {}); // stop this request chain  - we're navigating away
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.data.accessToken;
        localStorage.setItem("accessToken", newToken);

        refreshQueue.forEach((p) => p.resolve(newToken));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        refreshQueue.forEach((p) => p.reject(refreshError));
        refreshQueue = [];
        const wasTeamMember = localStorage.getItem("authRole") === "team_member";
        localStorage.removeItem("accessToken");
        localStorage.removeItem("authRole");
        // Don't redirect to login on public venue pages (subdomain URLs).
        // A subdomain means this is a public-facing venue site  - no login needed.
        const hostname = window.location.hostname;
        const parts = hostname.split(".");
        const reserved = ["www", "app", "api", "admin", "localhost"];
        const isPublicSubdomain = parts.length >= 2 && !reserved.includes(parts[0]) && parts[0] !== "localhost";
        if (!isPublicSubdomain) {
          window.location.href = wasTeamMember ? "/team-login" : "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;