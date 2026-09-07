import React from "react";
import { Routes, Route } from "react-router-dom";
import VenueHomePage from "../features/public-site/VenueHomePage.jsx";
import VerifyInvoicePage from "../features/public-site/VerifyInvoicePage.jsx";

export default function PublicRoutes() {
  return (
    <Routes>
      {/* Subdomain resolution happens on the backend via Host header;
          the frontend simply asks the API for "the current venue" using window.location.hostname */}
      <Route path="/" element={<VenueHomePage />} />
      <Route path="/verify/:invoiceId" element={<VerifyInvoicePage />} />
    </Routes>
  );
}