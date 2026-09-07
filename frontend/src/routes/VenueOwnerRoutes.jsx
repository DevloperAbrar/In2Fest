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
import GalleryEditor from "../features/venue-owner/website-builder/GalleryEditor.jsx";
import TestimonialsEditor from "../features/venue-owner/website-builder/TestimonialsEditor.jsx";
import ContactEditor from "../features/venue-owner/website-builder/ContactEditor.jsx";
import WebsiteBuilderHome from "../features/venue-owner/website-builder/WebsiteBuilderHome.jsx";
import SectionContentEditor from "../features/venue-owner/website-builder/SectionContentEditor.jsx";

import SlotList from "../features/venue-owner/slots/SlotList.jsx";
import InquiryList from "../features/venue-owner/inquiries/InquiryList.jsx";
import InquiryDetail from "../features/venue-owner/inquiries/InquiryDetail.jsx";
import BookingListView from "../features/venue-owner/bookings/BookingListView.jsx";
import BookingCalendarView from "../features/venue-owner/bookings/BookingCalendarView.jsx";
import ClientList from "../features/venue-owner/clients/ClientList.jsx";
import ClientDetail from "../features/venue-owner/clients/ClientDetail.jsx";

import QuotationForm from "../features/venue-owner/billing/QuotationForm.jsx";
import InvoiceForm from "../features/venue-owner/billing/InvoiceForm.jsx";
import ServiceCatalog from "../features/venue-owner/billing/ServiceCatalog.jsx";

import OwnerAnalytics from "../features/venue-owner/analytics/OwnerAnalytics.jsx";

import SettingsIndex from "../features/venue-owner/settings/index.jsx";
import VenueProfileSettings from "../features/venue-owner/settings/VenueProfileSettings.jsx";
import PaymentSettings from "../features/venue-owner/settings/PaymentSettings.jsx";
import GstSettings from "../features/venue-owner/settings/GstSettings.jsx";
import TeamMembers from "../features/venue-owner/settings/TeamMembers.jsx";
import SubscriptionDetails from "../features/venue-owner/settings/SubscriptionDetails.jsx";
import MarketplaceProfilePage from "../features/venue-owner/marketplace-profile/MarketplaceProfilePage.jsx";

import OwnerReviews from "../features/venue-owner/reviews/OwnerReviews.jsx";

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
        <Route path="website/gallery" element={<RequireFeature feature="website_builder"><GalleryEditor /></RequireFeature>} />
        <Route path="website/testimonials" element={<RequireFeature feature="website_builder"><TestimonialsEditor /></RequireFeature>} />
        <Route path="website/contact" element={<RequireFeature feature="website_builder"><ContactEditor /></RequireFeature>} />
        <Route path="marketplace-profile" element={<RequireFeature feature="marketplace_profile"><MarketplaceProfilePage /></RequireFeature>} />
        <Route path="website/section/:type" element={<RequireFeature feature="website_builder"><SectionContentEditor /></RequireFeature>} />

        <Route path="slots" element={<RequireFeature feature="slots"><SlotList /></RequireFeature>} />
        <Route path="inquiries" element={<RequireFeature feature="inquiries"><InquiryList /></RequireFeature>} />
        <Route path="inquiries/:id" element={<RequireFeature feature="inquiries"><InquiryDetail /></RequireFeature>} />
        <Route path="bookings" element={<RequireFeature feature="bookings"><BookingListView /></RequireFeature>} />
        <Route path="bookings/calendar" element={<RequireFeature feature="bookings"><BookingCalendarView /></RequireFeature>} />
        <Route path="clients" element={<RequireFeature feature="clients"><ClientList /></RequireFeature>} />
        <Route path="clients/:id" element={<RequireFeature feature="clients"><ClientDetail /></RequireFeature>} />

        <Route path="billing/quotation" element={<RequireFeature feature="billing"><QuotationForm /></RequireFeature>} />
        <Route path="billing/invoice" element={<RequireFeature feature="billing"><InvoiceForm /></RequireFeature>} />
        <Route path="billing/services" element={<RequireFeature feature="billing"><ServiceCatalog /></RequireFeature>} />

        <Route path="analytics" element={<RequireOwner><OwnerAnalytics /></RequireOwner>} />

        <Route path="settings" element={<RequireOwner><SettingsIndex /></RequireOwner>} />
        <Route path="settings/profile" element={<RequireOwner><VenueProfileSettings /></RequireOwner>} />
        <Route path="settings/payment" element={<RequireOwner><PaymentSettings /></RequireOwner>} />
        <Route path="settings/gst" element={<RequireOwner><GstSettings /></RequireOwner>} />
        <Route path="settings/team" element={<RequireOwner><TeamMembers /></RequireOwner>} />
        <Route path="settings/subscription" element={<RequireOwner><SubscriptionDetails /></RequireOwner>} />
        <Route path="reviews" element={<RequireFeature feature="reviews"><OwnerReviews /></RequireFeature>} />
      </Routes>
    </VenueProvider>
  );
}