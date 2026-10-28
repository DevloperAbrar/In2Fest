import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireOwner({ children }) {
  const { user } = useAuth();
  // Real team members are sent back. Demo accounts may open the owner-level gym pages (e.g. Gym Settings).
  if (user?.role === "team_member" && !user?.isDemo) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}