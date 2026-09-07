import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Card from "../../../components/common/Card";
import { marketplaceProfileService } from "../../../services/marketplaceProfileService";
import { metaService } from "../../../services/metaService";
import { showSuccess, showError } from "../../../components/common/Toast";

import BusinessDetailsTab from "./tabs/BusinessDetailsTab.jsx";
import ServiceAreasTab from "./tabs/ServiceAreasTab.jsx";
import ServicesChecklistTab from "./tabs/ServicesChecklistTab.jsx";
import PricingPoliciesTab from "./tabs/PricingPoliciesTab.jsx";
import SocialMediaTab from "./tabs/SocialMediaTab.jsx";
import SubdomainTab from "./tabs/SubdomainTab.jsx";

const TABS = [
  { key: "business", label: "Business Details" },
  { key: "areas", label: "Service Areas" },
  { key: "services", label: "Services" },
  { key: "pricing", label: "Pricing & Policies" },
  { key: "social", label: "Social & Media" },
  { key: "subdomain", label: "Subdomain" }
];

export default function MarketplaceProfilePage() {
  const { venue: baseVenue, loading: venueLoading, refetchVenue } = useVenue();
  const [activeTab, setActiveTab] = useState("business");
  const [saving, setSaving] = useState(false);

  const {
    data: profile,
    loading: profileLoading,
    refetch
  } = useFetch(baseVenue ? `/venues/${baseVenue.id}/marketplace-profile` : null);

  const { data: categories, loading: categoriesLoading } = useFetch("/meta/categories");


  if (venueLoading || profileLoading || categoriesLoading || !profile) {
    return (
      <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Marketplace Profile">
        <Loader fullScreen />
      </DashboardLayout>
    );
  }

  const venue = profile.venue;
  const completion = profile.completion;

  // Tab-to-tab navigation (Next / Back), independent of Save so users can
  // move around freely  - Save always stays a separate, explicit action.
  const currentIndex = TABS.findIndex((t) => t.key === activeTab);
  const isFirstTab = currentIndex === 0;
  const isLastTab = currentIndex === TABS.length - 1;
  const goNext = () => {
    if (!isLastTab) {
      setActiveTab(TABS[currentIndex + 1].key);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const goBack = () => {
    if (!isFirstTab) {
      setActiveTab(TABS[currentIndex - 1].key);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSaveProfile = async (payload) => {
    setSaving(true);
    try {
      await marketplaceProfileService.update(baseVenue.id, payload);
      showSuccess("Marketplace profile updated");
      // Sync both: the local marketplace fetch AND the global VenueContext
      // so website builder editors see up-to-date data too
      await Promise.all([refetch(), refetchVenue()]);
    } catch (err) {
      showError(err.response?.data?.message || "Could not save changes");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveServiceAreas = async (cityIds) => {
    setSaving(true);
    try {
      await marketplaceProfileService.updateServiceAreas(baseVenue.id, cityIds);
      showSuccess("Service areas updated");
      await Promise.all([refetch(), refetchVenue()]);
    } catch (err) {
      showError(err.response?.data?.message || "Could not save service areas");
    } finally {
      setSaving(false);
    }
  };

  const navProps = {
    onNext: isLastTab ? null : goNext,
    onBack: isFirstTab ? null : goBack
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Marketplace Profile">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">
            Fill this in so customers can find you on the VenueSafar discovery marketplace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">{completion.percentage}% complete</span>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "business" && (
            <BusinessDetailsTab
              venue={venue}
              categories={categories}
              onSave={handleSaveProfile}
              saving={saving}
              {...navProps}
            />
          )}
          {activeTab === "areas" && (
            <ServiceAreasTab
              venue={venue}
              onSaveProfile={handleSaveProfile}
              onSaveServiceAreas={handleSaveServiceAreas}
              saving={saving}
              {...navProps}
            />
          )}
          {activeTab === "services" && (
            <ServicesChecklistTab venue={venue} onSave={handleSaveProfile} saving={saving} {...navProps} />
          )}
          {activeTab === "pricing" && (
            <PricingPoliciesTab venue={venue} onSave={handleSaveProfile} saving={saving} {...navProps} />
          )}
          {activeTab === "social" && (
            <SocialMediaTab venue={venue} onSave={handleSaveProfile} saving={saving} {...navProps} />
          )}
          {activeTab === "subdomain" && <SubdomainTab venue={venue} {...navProps} />}
        </div>
      </Card>
    </DashboardLayout>
  );
}