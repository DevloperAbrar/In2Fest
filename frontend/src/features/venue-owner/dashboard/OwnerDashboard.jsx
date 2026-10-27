import React from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Repeat, Star, Users, Wallet } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useAuth } from "../../../context/AuthContext";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import { formatCurrency } from "../../../lib/formatters";
import { BASE_DOMAIN } from "../../../lib/constants";
import MarketplaceProfileChecklist from "../marketplace-profile/MarketplaceProfileChecklist.jsx";
import SetupChecklist from "./SetupChecklist.jsx";
import QuickActions from "./QuickActions.jsx";
import SubscriptionCard from "./SubscriptionCard.jsx";
import NeedsAttention from "./NeedsAttention.jsx";
import UpcomingBookings from "./UpcomingBookings.jsx";
import RecentInquiries from "./RecentInquiries.jsx";
import DashboardHero from "./DashboardHero.jsx";
import RevenueCard from "./RevenueCard.jsx";
import GrowCard from "./GrowCard.jsx";
import { DashboardSkeleton, StatTile } from "./dashboardUi.jsx";
import { fadeUp, stagger } from "./dashboardTheme.js";

export default function OwnerDashboard() {
  const { venue, loading: venueLoading } = useVenue();

  if (venueLoading) return <Loader fullScreen />;
  if (!venue) return <Navigate to="/dashboard/onboarding/plan" replace />;

  return <DashboardContent venue={venue} />;
}

function DashboardContent({ venue }) {
  const { user } = useAuth();
  const { data: analytics, loading, refetch: refetchAnalytics } = useFetch(`/analytics/owner/${venue.id}`);
  const { data: summary, loading: summaryLoading, refetch: refetchSummary } = useFetch(
    `/dashboard/owner/${venue.id}/summary`
  );
  const { data: marketplace } = useFetch(`/venues/${venue.id}/marketplace-profile/completion`);

  const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const publicUrl = isDev
    ? `${window.location.protocol}//${venue.subdomain}.${window.location.host}`
    : `https://${venue.subdomain}.${BASE_DOMAIN}`;

  const planFeatures = venue.subscription?.plan?.features || [];
  const hasWebsite = planFeatures.includes("website_builder");

  // Skeleton only on the very first load; a manual refresh keeps the screen and spins the icon.
  const firstLoad = loading && !analytics;
  const refreshing = (loading && !!analytics) || (summaryLoading && !!summary);
  const refresh = () => {
    refetchAnalytics();
    refetchSummary();
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={venue.hall_name}>
      {firstLoad ? (
        <DashboardSkeleton />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 md:space-y-5 pb-2">
          <DashboardHero
            userName={user?.name}
            venueName={venue.hall_name}
            analytics={analytics}
            refreshing={refreshing}
            onRefresh={refresh}
          />

          <QuickActions />

          {/* Onboarding nudges: each renders nothing once it's done, so the row collapses by itself */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 [&:not(:has(>:not(:empty)))]:hidden">
            <motion.div variants={fadeUp} className="empty:hidden">
              <SetupChecklist
                completedSteps={venue.setup_completed_steps || []}
                planFeatures={planFeatures}
                pageSections={venue.page_sections || []}
              />
            </motion.div>
            <motion.div variants={fadeUp} className="empty:hidden">
              <MarketplaceProfileChecklist percentage={marketplace?.percentage ?? 0} />
            </motion.div>
          </div>

          <motion.div variants={fadeUp}>
            {summaryLoading ? (
              <div className="h-16 rounded-2xl bg-navy-100/60 animate-pulse" />
            ) : (
              <NeedsAttention
                newInquiriesCount={summary?.newInquiriesCount ?? 0}
                unrepliedReviewsCount={(summary?.unrepliedReviews || []).length}
                pendingReviewsCount={summary?.pendingReviewsCount ?? 0}
                whatsappFailedCount={summary?.whatsappStats?.failed ?? 0}
              />
            )}
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatTile
              icon={Wallet}
              tone="violet"
              label="Lifetime revenue"
              value={Number(analytics?.totalRevenueAllTime) || 0}
              format={(v) => formatCurrency(Math.round(v))}
            />
            <StatTile icon={Users} tone="sky" label="Total clients" value={Number(analytics?.totalClients) || 0} />
            <StatTile
              icon={Repeat}
              tone="emerald"
              label="Avg booking value"
              value={Number(analytics?.avgBookingValue) || 0}
              format={(v) => formatCurrency(Math.round(v))}
            />
            <StatTile
              icon={Star}
              tone="amber"
              label="Average rating"
              value={analytics?.avgRating ? `${analytics.avgRating} ★` : "–"}
              sublabel={`${analytics?.totalReviews ?? 0} reviews`}
            />
          </div>

          <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
            <RevenueCard trend={analytics?.revenueTrend} className="lg:col-span-2" />
            <SubscriptionCard venue={venue} />
          </motion.div>

          {!summaryLoading && (
            <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
              <UpcomingBookings bookings={summary?.upcomingBookings || []} />
              <RecentInquiries inquiries={summary?.recentInquiries || []} />
            </motion.div>
          )}

          {hasWebsite && (
            <motion.div variants={fadeUp}>
              <GrowCard publicUrl={publicUrl} />
            </motion.div>
          )}
        </motion.div>
      )}
    </DashboardLayout>
  );
}