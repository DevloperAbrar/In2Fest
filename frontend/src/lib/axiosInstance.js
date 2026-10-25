import axios from "axios";
import { API_BASE_URL } from "./constants";
import { clearStoredAuth } from "./authStorage";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

// Impersonation tokens live in sessionStorage (tab-scoped), never
// localStorage (shared across every tab of this origin). This is what
// stops an admin opening "view as vendor" in a new tab from silently
// swapping out their own logged-in session in the tab they started from.
axiosInstance.interceptors.request.use((config) => {
  const impersonationToken = sessionStorage.getItem("impersonationToken");
  const token = impersonationToken || localStorage.getItem("accessToken");
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

    const isImpersonating = !!sessionStorage.getItem("impersonationToken");

    // Deactivation is not a token-expiry problem  - never attempt a refresh
    // for this, just send the user straight to a clear "deactivated" screen.
    if (
      error.response?.status === 403 &&
      (errorCode === "ACCOUNT_DEACTIVATED" || errorCode === "VENUE_DEACTIVATED")
    ) {
      if (isImpersonating) {
        sessionStorage.removeItem("impersonationToken");
        sessionStorage.removeItem("authRole");
        const message = error.response.data.message;
        window.location.href = `/account-deactivated?msg=${encodeURIComponent(message)}&role=owner`;
        return new Promise(() => {});
      }
      const wasTeamMember = localStorage.getItem("authRole") === "team_member";
      clearStoredAuth();
      const message = error.response.data.message;
      window.location.href = `/account-deactivated?msg=${encodeURIComponent(message)}&role=${wasTeamMember ? "team_member" : "owner"}`;
      return new Promise(() => {}); // stop this request chain  - we're navigating away
    }

    // An impersonation token is short-lived on purpose and has no refresh
    // token of its own (the browser's refreshToken cookie belongs to the
    // admin's own session, not the impersonated vendor)  - so on 401 just
    // end the impersonation view instead of trying to refresh with it.
    if (error.response?.status === 401 && isImpersonating) {
      sessionStorage.removeItem("impersonationToken");
      sessionStorage.removeItem("authRole");
      window.location.href = "/login?error=" + encodeURIComponent("Your admin preview session has expired.");
      return new Promise(() => {});
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
          { withCredentials: true, timeout: 15000 }
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

        // Only a clear "401 / 403" from the refresh endpoint means the login is
        // really over. No internet, a timeout, a restarting server (502/503),
        // rate limiting (429) etc. must NOT sign the person out  - the saved
        // login is kept and the next request simply tries again.
        const refreshStatus = refreshError?.response?.status;
        const sessionIsOver = refreshStatus === 401 || refreshStatus === 403;
        if (!sessionIsOver) {
          return Promise.reject(refreshError);
        }

        const wasTeamMember = localStorage.getItem("authRole") === "team_member";
        clearStoredAuth();
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