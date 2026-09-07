import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireOwner({ children }) {
  const { user } = useAuth();
  if (user?.role === "team_member") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}