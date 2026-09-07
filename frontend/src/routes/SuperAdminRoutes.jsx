import React from "react";
import { Routes, Route } from "react-router-dom";

import SuperAdminDashboard from "../features/superadmin/dashboard/SuperAdminDashboard.jsx";
import VenueList from "../features/superadmin/venues/VenueList.jsx";
import VenueDetail from "../features/superadmin/venues/VenueDetail.jsx";
import PlanList from "../features/superadmin/plans/PlanList.jsx";
import PaymentList from "../features/superadmin/payments/PaymentList.jsx";
import MessageComposer from "../features/superadmin/whatsapp-center/MessageComposer.jsx";
import AdminAnalytics from "../features/superadmin/analytics/AdminAnalytics.jsx";
import PlatformSettings from "../features/superadmin/settings/PlatformSettings.jsx";

import FeaturedVendors from "../features/superadmin/discovery/FeaturedVendors.jsx";
import ReviewModeration from "../features/superadmin/discovery/ReviewModeration.jsx";
import FreeListings from "../features/superadmin/discovery/FreeListings.jsx";
import VerificationBadges from "../features/superadmin/discovery/VerificationBadges.jsx";
import CityManager from "../features/superadmin/discovery/CityManager.jsx";
import CategoryManager from "../features/superadmin/discovery/CategoryManager.jsx";
import MarketplaceAnalytics from "../features/superadmin/discovery/MarketplaceAnalytics.jsx";

export default function SuperAdminRoutes() {
  return (
    <Routes>
      <Route index element={<SuperAdminDashboard />} />
      <Route path="venues" element={<VenueList />} />
      <Route path="venues/:id" element={<VenueDetail />} />
      <Route path="plans" element={<PlanList />} />
      <Route path="payments" element={<PaymentList />} />
      <Route path="whatsapp" element={<MessageComposer />} />
      <Route path="analytics" element={<AdminAnalytics />} />
      <Route path="settings" element={<PlatformSettings />} />

      <Route path="discovery/featured-vendors" element={<FeaturedVendors />} />
      <Route path="discovery/reviews" element={<ReviewModeration />} />
      <Route path="discovery/free-listings" element={<FreeListings />} />
      <Route path="discovery/badges" element={<VerificationBadges />} />
      <Route path="discovery/cities" element={<CityManager />} />
      <Route path="discovery/categories" element={<CategoryManager />} />
      <Route path="discovery/analytics" element={<MarketplaceAnalytics />} />
    </Routes>
  );
}