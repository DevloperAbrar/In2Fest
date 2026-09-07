import React from "react";
import { Navigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Card from "../../../components/common/Card";
import KpiCard from "../../../components/common/KpiCard";
import SetupChecklist from "./SetupChecklist.jsx";
import QuickActions from "./QuickActions.jsx";
import SubscriptionCard from "./SubscriptionCard.jsx";
import NeedsAttention from "./NeedsAttention.jsx";
import UpcomingBookings from "./UpcomingBookings.jsx";
import RecentInquiries from "./RecentInquiries.jsx";
import { formatCurrency } from "../../../lib/formatters";
import { Copy } from "lucide-react";
import { showSuccess } from "../../../components/common/Toast";
import { BASE_DOMAIN } from "../../../lib/constants";
import MarketplaceProfileChecklist from "../marketplace-profile/MarketplaceProfileChecklist.jsx";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  IndianRupee, CalendarCheck, TrendingUp, Clock, Wallet, Users, Repeat, Star
} from "lucide-react";

export default function OwnerDashboard() {
  const { venue, loading: venueLoading } = useVenue();

  if (venueLoading) return <Loader fullScreen />;
  if (!venue) return <Navigate to="/dashboard/onboarding/plan" replace />;

  return <DashboardContent venue={venue} />;
}

function DashboardContent({ venue }) {
  const { data: analytics, loading } = useFetch(`/analytics/owner/${venue.id}`);
  const { data: summary, loading: summaryLoading } = useFetch(`/dashboard/owner/${venue.id}/summary`);
  const { data: marketplace } = useFetch(`/venues/${venue.id}/marketplace-profile/completion`);

  const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const publicUrl = isDev
    ? `${window.location.protocol}//${venue.subdomain}.${window.location.host}`
    : `https://${venue.subdomain}.${BASE_DOMAIN}`;

  const planFeatures = venue.subscription?.plan?.features || [];

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    showSuccess("Link copied to clipboard");
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={venue.hall_name}>
      <SetupChecklist
        completedSteps={venue.setup_completed_steps || []}
        planFeatures={planFeatures}
        pageSections={venue.page_sections || []}
      />
      <MarketplaceProfileChecklist percentage={marketplace?.percentage ?? 0} />

      <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Your public website</p>
          <p className="font-medium text-primary-700">{publicUrl}</p>
        </div>
        <button onClick={copyLink} className="flex items-center gap-2 text-sm text-primary-600 hover:underline">
          <Copy size={14} /> Copy Link
        </button>
      </div>

      <QuickActions planFeatures={planFeatures} />

      {loading ? (
        <Loader />
      ) : (
        <>
          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard icon={IndianRupee} label="This Month's Revenue" value={formatCurrency(analytics?.monthlyRevenue)} accent="#7c3aed" />
            <KpiCard icon={CalendarCheck} label="This Month's Bookings" value={analytics?.monthlyBookings ?? 0} accent="#3b82f6" />
            <KpiCard icon={TrendingUp} label="Inquiry Conversion" value={`${analytics?.conversionRate ?? 0}%`} accent="#10b981" />
            <KpiCard icon={Clock} label="Pending Payments" value={formatCurrency(analytics?.totalPendingPayments)} accent="#f59e0b" />
            <KpiCard icon={Wallet} label="Lifetime Revenue" value={formatCurrency(analytics?.totalRevenueAllTime)} accent="#7c3aed" />
            <KpiCard icon={Users} label="Total Clients" value={analytics?.totalClients ?? 0} accent="#3b82f6" />
            <KpiCard icon={Repeat} label="Avg Booking Value" value={formatCurrency(analytics?.avgBookingValue)} accent="#10b981" />
            <KpiCard
              icon={Star}
              label="Average Rating"
              value={analytics?.avgRating ? `${analytics.avgRating} ★` : " -"}
              sublabel={`${analytics?.totalReviews ?? 0} reviews`}
              accent="#f59e0b"
            />
          </div>

          {/* ── Revenue trend + subscription/attention ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card title="6-Month Revenue Trend" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics?.revenueTrend}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <SubscriptionCard venue={venue} />
          </div>

          {!summaryLoading && (
            <>
              <div className="mb-6">
                <NeedsAttention
                  newInquiriesCount={summary?.newInquiriesCount ?? 0}
                  unrepliedReviewsCount={(summary?.unrepliedReviews || []).length}
                  pendingReviewsCount={summary?.pendingReviewsCount ?? 0}
                  whatsappFailedCount={summary?.whatsappStats?.failed ?? 0}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UpcomingBookings bookings={summary?.upcomingBookings || []} />
                <RecentInquiries inquiries={summary?.recentInquiries || []} />
              </div>
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}