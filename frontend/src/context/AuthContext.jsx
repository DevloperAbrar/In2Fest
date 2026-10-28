import React, { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../lib/axiosInstance";
import { cacheUser, clearStoredAuth, getCachedUser, isAuthRejection } from "../lib/authStorage";

const AuthContext = createContext(null);

const ME_TIMEOUT_MS = 10000;
const RETRY_DELAYS_MS = [1500, 3000]; // 3 attempts in total
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // True only in a tab that opened an admin "view as vendor" session.
  // Scoped via sessionStorage so it never leaks into the admin's other tabs.
  const [isImpersonating, setIsImpersonating] = useState(
    () => !!sessionStorage.getItem("impersonationToken")
  );

  // Checks the saved login with the server.
  //  - Server says 401 (and the refresh cookie cannot renew it)  -> really signed out.
  //  - Anything else (no internet, slow phone wake-up, server restarting, 429, 5xx)
  //    -> the login is KEPT. The app opens with the saved profile and re-checks.
  const fetchCurrentUser = async () => {
    const impersonationToken = sessionStorage.getItem("impersonationToken");
    const token = impersonationToken || localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    const cached = impersonationToken ? null : getCachedUser();
    let openedFromCache = false;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const { data } = await axiosInstance.get("/auth/me", { timeout: ME_TIMEOUT_MS });
        setUser(data.data);
        setIsImpersonating(!!impersonationToken);
        if (!impersonationToken) cacheUser(data.data);
        setLoading(false);
        return;
      } catch (err) {
        if (isAuthRejection(err)) {
          if (impersonationToken) {
            sessionStorage.removeItem("impersonationToken");
            sessionStorage.removeItem("authRole");
          } else {
            clearStoredAuth();
          }
          setUser(null);
          setIsImpersonating(false);
          setLoading(false);
          return;
        }

        // Temporary problem: show the app right away from the saved profile.
        if (cached && !openedFromCache) {
          openedFromCache = true;
          setUser(cached);
          setIsImpersonating(false);
          setLoading(false);
        }
        if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
    setLoading(false);
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
    cacheUser(data.data.user);
    setUser(data.data.user);
    return data.data.user;
  };

  // Team members sign in with email + password  - separate identity from the
  // venue owner's Google account, scoped to one venue + their permissions.
  const loginTeamMember = async (email, password) => {
    const { data } = await axiosInstance.post("/auth/team-login", { email, password });
    localStorage.setItem("accessToken", data.data.accessToken);
    localStorage.setItem("authRole", "team_member");
    const u = data.data.user;
    cacheUser({
      id: u.id,
      email: u.email,
      role: "team_member",
      name: u.name,
      venueId: u.venueId,
      permissions: u.permissions,
      isDemo: !!u.isDemo,
      demoExpiresAt: u.demoExpiresAt || null
    });
    setUser(u);
    return u;
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
    clearStoredAuth();
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