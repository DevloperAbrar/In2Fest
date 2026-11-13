import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { firstAllowedPath, hasScope, restrictedHome } from "../../lib/teamScopes";

// Main /dashboard: a member limited to specific tasks goes straight to their first allowed page.
export function HomeGate({ children }) {
  const { user } = useAuth();
  const target = restrictedHome(user);
  return target ? <Navigate to={target} replace /> : children;
}

// Module landing page (e.g. /dashboard/gym): members without "Reports" are sent to their first allowed tab.
export function ScopeGate({ module, children }) {
  const { user } = useAuth();
  if (hasScope(user, module, ["reports"])) return children;
  const target = firstAllowedPath(user, module);
  return target ? <Navigate to={target} replace /> : children;
}