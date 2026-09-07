import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import publicAuthApi, { API_BASE_URL } from "../services/publicAuthApi";

const STORAGE_KEY = "visitorAccessToken";
const PublicAuthContext = createContext(null);

// Plain axios instance (not publicAuthApi)  - used to silently check the MAIN app's
// vendor session via its existing /auth/refresh + /auth/me endpoints. This works
// because the vendor's refreshToken cookie is scoped to the API's own domain, so
// the browser sends it on any request to that domain, regardless of which app's
// page made the request (as long as credentials are included).
const mainApi = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

export function PublicAuthProvider({ children }) {
  const [user, setUser] = useState(null);           // signed-in visitor (PublicUser)
  const [vendorSession, setVendorSession] = useState(null); // detected vendor (User), if any
  const [vendorToken, setVendorToken] = useState(null);     // kept in memory only, not persisted
  const [loading, setLoading] = useState(true);

  const loadVisitor = useCallback(async (token) => {
    const { data } = await publicAuthApi.get("/me", { headers: { Authorization: `Bearer ${token}` } });
    setUser(data.data);
  }, []);

  const detectVendorSession = useCallback(async () => {
    try {
      const { data: refreshData } = await mainApi.post("/auth/refresh");
      const token = refreshData.data.accessToken;
      const { data: meData } = await mainApi.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (meData.data.role === "venue_owner") {
        setVendorSession(meData.data);
        setVendorToken(token);
      }
    } catch {
      // No active vendor session in this browser  - that's fine, most visitors won't have one.
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          await loadVisitor(stored);
          setLoading(false);
          return; // already have a visitor identity, no need to also check vendor session
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      await detectVendorSession();
      setLoading(false);
    })();
  }, [loadVisitor, detectVendorSession]);

  const login = async (credential) => {
    const { data } = await publicAuthApi.post("/google", { credential });
    localStorage.setItem(STORAGE_KEY, data.data.accessToken);
    setUser(data.data.user);
    return data.data;
  };

  const logout = async () => {
    try { await publicAuthApi.post("/logout"); } catch { /* ignore */ }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const refreshMe = async () => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token) await loadVisitor(token);
  };

  // Whichever identity is active right now  - used by the review form.
  const activeIdentity = user
    ? { type: "visitor", id: user.id, name: user.name, token: localStorage.getItem(STORAGE_KEY) }
    : vendorSession
      ? { type: "vendor", id: vendorSession.id, name: vendorSession.name, token: vendorToken }
      : null;

  return (
    <PublicAuthContext.Provider value={{ user, vendorSession, activeIdentity, loading, login, logout, refreshMe }}>
      {children}
    </PublicAuthContext.Provider>
  );
}

export function usePublicAuth() {
  const ctx = useContext(PublicAuthContext);
  if (!ctx) throw new Error("usePublicAuth must be used inside PublicAuthProvider");
  return ctx;
}