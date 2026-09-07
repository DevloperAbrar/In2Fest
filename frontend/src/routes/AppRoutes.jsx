import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/layout/ProtectedRoute";

import LoginPage from "../features/auth/LoginPage.jsx";
import TeamLoginPage from "../features/auth/TeamLoginPage.jsx";
import AuthCallback from "../features/auth/AuthCallback.jsx";
import AccountDeactivatedPage from "../features/auth/AccountDeactivatedPage.jsx";
import SuperAdminRoutes from "./SuperAdminRoutes.jsx";
import VenueOwnerRoutes from "./VenueOwnerRoutes.jsx";
import PublicRoutes from "./PublicRoutes.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/team-login" element={<TeamLoginPage />} />
      <Route path="/account-deactivated" element={<AccountDeactivatedPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
        <Route path="/admin/*" element={<SuperAdminRoutes />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["venue_owner", "team_member"]} />}>
        <Route path="/dashboard/*" element={<VenueOwnerRoutes />} />
      </Route>

      {/* Public venue websites  - matched by subdomain, not path */}
      <Route path="/*" element={<PublicRoutes />} />
    </Routes>
  );
}