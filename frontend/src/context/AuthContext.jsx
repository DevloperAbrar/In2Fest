import React, { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../lib/axiosInstance";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // True only in a tab that opened an admin "view as vendor" session.
  // Scoped via sessionStorage so it never leaks into the admin's other tabs.
  const [isImpersonating, setIsImpersonating] = useState(
    () => !!sessionStorage.getItem("impersonationToken")
  );

  const fetchCurrentUser = async () => {
    const impersonationToken = sessionStorage.getItem("impersonationToken");
    const token = impersonationToken || localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await axiosInstance.get("/auth/me");
      setUser(data.data);
      setIsImpersonating(!!impersonationToken);
    } catch {
      if (impersonationToken) {
        sessionStorage.removeItem("impersonationToken");
        sessionStorage.removeItem("authRole");
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("authRole");
      }
      setUser(null);
      setIsImpersonating(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    // If the browser restores this page from its back/forward cache (bfcache) --
    // e.g. the user closed the tab without logging out and reopened it later --
    // React never re-runs its startup code, so the UI would otherwise keep
    // showing the last-known user (name in navbar, etc.) even though the
    // session may have expired since then. Re-validate whenever that happens.
    const handlePageShow = (event) => {
      if (event.persisted) {
        setLoading(true);
        fetchCurrentUser();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const loginAdmin = async (email, password) => {
    const { data } = await axiosInstance.post("/auth/admin/login", { email, password });
    localStorage.setItem("accessToken", data.data.accessToken);
    localStorage.setItem("authRole", "super_admin");
    setUser(data.data.user);
    return data.data.user;
  };

  // Team members sign in with email + password  - separate identity from the
  // venue owner's Google account, scoped to one venue + their permissions.
  const loginTeamMember = async (email, password) => {
    const { data } = await axiosInstance.post("/auth/team-login", { email, password });
    localStorage.setItem("accessToken", data.data.accessToken);
    localStorage.setItem("authRole", "team_member");
    setUser(data.data.user);
    return data.data.user;
  };

  const setTokenFromGoogleCallback = async (token) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("authRole", "venue_owner");
    await fetchCurrentUser();
  };

  // Super-admin "view as vendor". Stored in sessionStorage (this tab only)
  // so it can never overwrite a real login sitting in localStorage.
  const startImpersonation = async (token) => {
    sessionStorage.setItem("impersonationToken", token);
    sessionStorage.setItem("authRole", "venue_owner");
    await fetchCurrentUser();
  };

  // Ends the preview in this tab only. Deliberately does NOT call
  // /auth/logout  - that would clear the refreshToken cookie, which is
  // shared by the browser and belongs to the admin's own real session.
  const exitImpersonation = () => {
    sessionStorage.removeItem("impersonationToken");
    sessionStorage.removeItem("authRole");
    setUser(null);
    setIsImpersonating(false);
    if (window.opener) {
      window.close();
    } else {
      window.location.href = "/login";
    }
  };

  const logout = async () => {
    if (isImpersonating) {
      exitImpersonation();
      return;
    }
    await axiosInstance.post("/auth/logout").catch(() => {});
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authRole");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isImpersonating,
        loginAdmin,
        loginTeamMember,
        setTokenFromGoogleCallback,
        startImpersonation,
        exitImpersonation,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}