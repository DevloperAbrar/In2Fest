import React from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import StatsCards from "./StatsCards.jsx";
import RevenueGraph from "./RevenueGraph.jsx";
import RecentSignups from "./RecentSignups.jsx";
import ExpiringSubscriptions from "./ExpiringSubscriptions.jsx";
import RecentPayments from "./RecentPayments.jsx";
import AttentionQueue from "./AttentionQueue.jsx";
import Loader from "../../../components/common/Loader";

export default function SuperAdminDashboard() {
  const { data: stats, loading: statsLoading } = useFetch("/analytics/admin/dashboard");
  const { data: mrrTrend, loading: trendLoading } = useFetch("/analytics/admin/mrr-trend");
  const { data: summary, loading: summaryLoading } = useFetch("/dashboard/admin/summary");

  if (statsLoading) return <Loader fullScreen />;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Dashboard">
      <div className="space-y-6">
        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {!trendLoading && (
            <div className="lg:col-span-2">
              <RevenueGraph data={mrrTrend} />
            </div>
          )}
          {!summaryLoading && (
            <AttentionQueue
              pendingReviewModerationCount={summary?.pendingReviewModerationCount ?? 0}
              pendingFreeListingsCount={summary?.pendingFreeListingsCount ?? 0}
              whatsappFailedCount={summary?.whatsappStats?.failed ?? 0}
            />
          )}
        </div>

        {!summaryLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpiringSubscriptions subscriptions={summary?.expiringSubscriptions || []} />
            <RecentSignups venues={summary?.recentSignups || []} />
          </div>
        )}

        {!summaryLoading && (
          <RecentPayments payments={summary?.recentPayments || []} />
        )}
      </div>
    </DashboardLayout>
  );
}