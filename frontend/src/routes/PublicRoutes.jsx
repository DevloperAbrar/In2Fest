import React, { useEffect } from "react";
import { Routes, Route, useParams } from "react-router-dom";
import VenueHomePage from "../features/public-site/VenueHomePage.jsx";
import VerifyInvoicePage from "../features/public-site/VerifyInvoicePage.jsx";

// ✅ NEW: Referral redirect component
function ReferralRedirect() {
  const { code } = useParams();
  useEffect(() => {
    if (code) {
      localStorage.setItem("in2fest_referral_code", code);
    }
    window.location.href = "/login?ref=" + (code || "");
  }, [code]);
  return null;
}

export default function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<VenueHomePage />} />
      <Route path="/verify/:invoiceId" element={<VerifyInvoicePage />} />

      {/* ✅ NEW: /r/:code -> saves referral code in localStorage -> redirects to login/register */}
      <Route path="/r/:code" element={<ReferralRedirect />} />
    </Routes>
  );
}