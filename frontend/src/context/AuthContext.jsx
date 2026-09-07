import React, { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../lib/axiosInstance";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await axiosInstance.get("/auth/me");
      setUser(data.data);
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("authRole");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
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

  const logout = async () => {
    await axiosInstance.post("/auth/logout").catch(() => {});
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authRole");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginAdmin, loginTeamMember, setTokenFromGoogleCallback, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}