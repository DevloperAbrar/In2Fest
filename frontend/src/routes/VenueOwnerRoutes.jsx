import React from "react";
import { Routes, Route } from "react-router-dom";
import { VenueProvider } from "../context/VenueContext.jsx";
import RequireFeature from "../components/layout/RequireFeature.jsx";
import RequireOwner from "../components/layout/RequireOwner.jsx";

import OwnerDashboard from "../features/venue-owner/dashboard/OwnerDashboard.jsx";
import VenueDetailsForm from "../features/venue-owner/onboarding/VenueDetailsForm.jsx";
import PlanSelection from "../features/venue-owner/onboarding/PlanSelection.jsx";

import TemplatePicker from "../features/venue-owner/website-builder/TemplatePicker.jsx";
import HeroEditor from "../features/venue-owner/website-builder/HeroEditor.jsx";
import AboutEditor from "../features/venue-owner/website-builder/AboutEditor.jsx";
import ServicesEditor from "../features/venue-owner/website-builder/ServicesEditor.jsx";
import BusinessHoursEditor from "../features/venue-owner/website-builder/BusinessHoursEditor.jsx";
import GalleryEditor from "../features/venue-owner/website-builder/GalleryEditor.jsx";
import ContactEditor from "../features/venue-owner/website-builder/ContactEditor.jsx";
import WebsiteBuilderHome from "../features/venue-owner/website-builder/WebsiteBuilderHome.jsx";
import SectionContentEditor from "../features/venue-owner/website-builder/SectionContentEditor.jsx";
import SocialLinksEditor from "../features/venue-owner/website-builder/SocialLinksEditor.jsx";
import PackagesSectionEditor from "../features/venue-owner/website-builder/PackagesSectionEditor.jsx";

import SlotList from "../features/venue-owner/slots/SlotList.jsx";
import InquiryList from "../features/venue-owner/inquiries/InquiryList.jsx";
import InquiryDetail from "../features/venue-owner/inquiries/InquiryDetail.jsx";
import BookingListView from "../features/venue-owner/bookings/BookingListView.jsx";
import BookingCalendarView from "../features/venue-owner/bookings/BookingCalendarView.jsx";
import ClientList from "../features/venue-owner/clients/ClientList.jsx";
import ClientDetail from "../features/venue-owner/clients/ClientDetail.jsx";

import BillingHome from "../features/venue-owner/billing/BillingHome.jsx";
import DocumentEditor from "../features/venue-owner/billing/DocumentEditor.jsx";
import ServiceCatalog from "../features/venue-owner/billing/ServiceCatalog.jsx";
import BillingCustomers from "../features/venue-owner/billing/BillingCustomers.jsx";
import InventoryHome from "../features/venue-owner/inventory/InventoryHome.jsx";

import OwnerAnalytics from "../features/venue-owner/analytics/OwnerAnalytics.jsx";

import SettingsIndex from "../features/venue-owner/settings/index.jsx";
import VenueProfileSettings from "../features/venue-owner/settings/VenueProfileSettings.jsx";
import PaymentSettings from "../features/venue-owner/settings/PaymentSettings.jsx";
import GstSettings from "../features/venue-owner/settings/GstSettings.jsx";
import TeamMembers from "../features/venue-owner/settings/TeamMembers.jsx";
import SubscriptionDetails from "../features/venue-owner/settings/SubscriptionDetails.jsx";
import MarketplaceProfilePage from "../features/venue-owner/marketplace-profile/MarketplaceProfilePage.jsx";

import OwnerReviews from "../features/venue-owner/reviews/OwnerReviews.jsx";

// ✅ NEW: Referrals page
import ReferralsPage from "../features/venue-owner/referrals/ReferralsPage.jsx";

import GymDashboard from "../features/venue-owner/gym/GymDashboard.jsx";
import GymMembers from "../features/venue-owner/gym/GymMembers.jsx";
import MemberDetail from "../features/venue-owner/gym/MemberDetail.jsx";
import GymPlans from "../features/venue-owner/gym/GymPlans.jsx";
import WorkoutPlans from "../features/venue-owner/gym/WorkoutPlans.jsx";
import WorkoutBuilder from "../features/venue-owner/gym/WorkoutBuilder.jsx";
import GymLeads from "../features/venue-owner/gym/GymLeads.jsx";
import GymSettings from "../features/venue-owner/gym/GymSettings.jsx";
import FoodDashboard from "../features/venue-owner/food/FoodDashboard.jsx";
import FoodOrders from "../features/venue-owner/food/FoodOrders.jsx";
import FoodPOS from "../features/venue-owner/food/FoodPOS.jsx";
import FoodMenu from "../features/venue-owner/food/FoodMenu.jsx";
import FoodStock from "../features/venue-owner/food/FoodStock.jsx";
import FoodCustomers from "../features/venue-owner/food/FoodCustomers.jsx";
import FoodSetup from "../features/venue-owner/food/FoodSetup.jsx";
import FoodOffers from "../features/venue-owner/food/FoodOffers.jsx";

import OrdersPage from "../features/venue-owner/orders/OrdersPage.jsx";

export default function VenueOwnerRoutes() {
  return (
    <VenueProvider>
      <Routes>
        <Route index element={<OwnerDashboard />} />
        <Route path="onboarding/plan" element={<RequireOwner><PlanSelection /></RequireOwner>} />
        <Route path="onboarding/details" element={<RequireOwner><VenueDetailsForm /></RequireOwner>} />

        <Route path="website" element={<RequireFeature feature="website_builder"><WebsiteBuilderHome /></RequireFeature>} />
        <Route path="website/template" element={<RequireFeature feature="website_builder"><TemplatePicker /></RequireFeature>} />
        <Route path="website/hero" element={<RequireFeature feature="website_builder"><HeroEditor /></RequireFeature>} />
        <Route path="website/about" element={<RequireFeature feature="website_builder"><AboutEditor /></RequireFeature>} />
        <Route path="website/services" element={<RequireFeature feature="website_builder"><ServicesEditor /></RequireFeature>} />
        <Route path="website/hours" element={<RequireFeature feature="website_builder"><BusinessHoursEditor /></RequireFeature>} />
        <Route path="website/section/hours" element={<RequireFeature feature="website_builder"><BusinessHoursEditor /></RequireFeature>} />
        <Route path="website/gallery" element={<RequireFeature feature="website_builder"><GalleryEditor /></RequireFeature>} />
        <Route path="website/contact" element={<RequireFeature feature="website_builder"><ContactEditor /></RequireFeature>} />
        <Route path="marketplace-profile" element={<RequireFeature feature="marketplace_profile"><MarketplaceProfilePage /></RequireFeature>} />

        <Route path="website/section/packages" element={<RequireFeature feature="website_builder"><PackagesSectionEditor /></RequireFeature>} />
        <Route path="website/section/social_links" element={<RequireFeature feature="website_builder"><SocialLinksEditor /></RequireFeature>} />
        <Route path="website/section/:type" element={<RequireFeature feature="website_builder"><SectionContentEditor /></RequireFeature>} />

        <Route path="slots" element={<RequireFeature feature="slots"><SlotList /></RequireFeature>} />
        <Route path="inquiries" element={<RequireFeature feature="inquiries"><InquiryList /></RequireFeature>} />
        <Route path="inquiries/:id" element={<RequireFeature feature="inquiries"><InquiryDetail /></RequireFeature>} />
        <Route path="bookings" element={<RequireFeature feature="bookings"><BookingListView /></RequireFeature>} />
        <Route path="bookings/calendar" element={<RequireFeature feature="bookings"><BookingCalendarView /></RequireFeature>} />
        <Route path="clients" element={<RequireFeature feature="clients"><ClientList /></RequireFeature>} />
        <Route path="clients/:id" element={<RequireFeature feature="clients"><ClientDetail /></RequireFeature>} />

        <Route path="billing/quotation" element={<RequireFeature feature="billing"><BillingHome key="q" initialTab="quotation" /></RequireFeature>} />
        <Route path="billing/invoice" element={<RequireFeature feature="billing"><BillingHome key="i" initialTab="invoice" /></RequireFeature>} />
        <Route path="billing/new" element={<RequireFeature feature="billing"><DocumentEditor /></RequireFeature>} />
        <Route path="billing/:id/edit" element={<RequireFeature feature="billing"><DocumentEditor /></RequireFeature>} />
        <Route path="billing/services" element={<RequireFeature feature="billing"><ServiceCatalog /></RequireFeature>} />
        <Route path="billing/customers" element={<RequireFeature feature="billing"><BillingCustomers /></RequireFeature>} />
        <Route path="catalog" element={<RequireFeature feature="billing"><ServiceCatalog /></RequireFeature>} />
        <Route path="inventory" element={<RequireFeature feature="billing"><InventoryHome /></RequireFeature>} />
        <Route path="orders" element={<RequireFeature feature="billing"><OrdersPage /></RequireFeature>} />
        <Route path="analytics" element={<RequireOwner><OwnerAnalytics /></RequireOwner>} />

        <Route path="settings" element={<RequireOwner><SettingsIndex /></RequireOwner>} />
        <Route path="settings/profile" element={<RequireOwner><VenueProfileSettings /></RequireOwner>} />
        <Route path="settings/payment" element={<RequireOwner><PaymentSettings /></RequireOwner>} />
        <Route path="settings/gst" element={<RequireOwner><GstSettings /></RequireOwner>} />
        <Route path="settings/team" element={<RequireOwner><TeamMembers /></RequireOwner>} />
        <Route path="settings/subscription" element={<RequireOwner><SubscriptionDetails /></RequireOwner>} />
        <Route path="reviews" element={<RequireFeature feature="reviews"><OwnerReviews /></RequireFeature>} />

        <Route path="gym" element={<RequireFeature feature="gym"><GymDashboard /></RequireFeature>} />
        <Route path="gym/members" element={<RequireFeature feature="gym"><GymMembers /></RequireFeature>} />
        <Route path="gym/members/:id" element={<RequireFeature feature="gym"><MemberDetail /></RequireFeature>} />
        <Route path="gym/plans" element={<RequireFeature feature="gym"><GymPlans /></RequireFeature>} />
        <Route path="gym/workouts" element={<RequireFeature feature="gym"><WorkoutPlans /></RequireFeature>} />
        <Route path="gym/workouts/:id" element={<RequireFeature feature="gym"><WorkoutBuilder /></RequireFeature>} />
        <Route path="gym/leads" element={<RequireFeature feature="gym"><GymLeads /></RequireFeature>} />
        <Route path="gym/settings" element={<RequireOwner><RequireFeature feature="gym"><GymSettings /></RequireFeature></RequireOwner>} />
        <Route path="food" element={<RequireFeature feature="food"><FoodDashboard /></RequireFeature>} />
        <Route path="food/orders" element={<RequireFeature feature="food"><FoodOrders /></RequireFeature>} />
        <Route path="food/pos" element={<RequireFeature feature="food"><FoodPOS /></RequireFeature>} />
        <Route path="food/menu" element={<RequireFeature feature="food"><FoodMenu /></RequireFeature>} />
        <Route path="food/offers" element={<RequireFeature feature="food"><FoodOffers /></RequireFeature>} />
        <Route path="food/stock" element={<RequireFeature feature="food"><FoodStock /></RequireFeature>} />
        <Route path="food/customers" element={<RequireFeature feature="food"><FoodCustomers /></RequireFeature>} />
        <Route path="food/setup" element={<RequireOwner><RequireFeature feature="food"><FoodSetup /></RequireFeature></RequireOwner>} />
        {/* ✅ NEW: Referrals route */}
        <Route path="referrals" element={<RequireOwner><ReferralsPage /></RequireOwner>} />
      </Routes>
    </VenueProvider>
  );
}