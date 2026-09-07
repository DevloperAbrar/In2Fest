import React from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Card from "../../../components/common/Card";
import Loader from "../../../components/common/Loader";
import KpiCard from "../../../components/common/KpiCard";
import DonutBreakdown from "../../../components/common/DonutBreakdown";
import ChurnChart from "./ChurnChart.jsx";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { formatCurrency } from "../../../lib/formatters";
import {
  Building2, Wallet, TrendingUp, UserCheck, IndianRupee, ShieldCheck
} from "lucide-react";

export default function AdminAnalytics() {
  const { data: stats, loading: statsLoading } = useFetch("/analytics/admin/dashboard");
  const { data: mrrTrend, loading: mrrLoading } = useFetch("/analytics/admin/mrr-trend");
  const { data: churn, loading: churnLoading } = useFetch("/analytics/admin/churn");
  const { data: distribution, loading: distLoading } = useFetch("/analytics/admin/distribution");
  const { data: conversion, loading: convLoading } = useFetch("/analytics/admin/trial-conversion");
  const { data: signupTrend, loading: signupLoading } = useFetch("/analytics/admin/signup-trend");
  const { data: revByPlan, loading: planLoading } = useFetch("/analytics/admin/revenue-by-plan");
  const { data: paymentMethods, loading: pmLoading } = useFetch("/analytics/admin/payment-methods");
  const { data: subStatus, loading: subLoading } = useFetch("/analytics/admin/subscription-status");
  const { data: topVenues, loading: topLoading } = useFetch("/analytics/admin/top-venues");
  const { data: gst, loading: gstLoading } = useFetch("/analytics/admin/gst-adoption");

  if (statsLoading || churnLoading || distLoading || convLoading) return <Loader fullScreen />;

  const subStatusData = (subStatus || []).map((s) => ({ label: s.status, value: +s.count }));
  const paymentMethodData = (paymentMethods || []).map((p) => ({ label: p.method, value: +p.total }));
  const gstData = gst ? [{ label: "GST Enabled", value: gst.gstEnabled }, { label: "GST Disabled", value: gst.gstDisabled }] : [];

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Analytics">
      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Building2} label="Total Venues" value={stats?.totalVenues ?? 0} accent="#7c3aed" />
        <KpiCard icon={IndianRupee} label="MRR" value={formatCurrency(stats?.mrr)} accent="#10b981" />
        <KpiCard icon={Wallet} label="ARPU" value={formatCurrency(stats?.arpu)} sublabel="per active venue" accent="#3b82f6" />
        <KpiCard icon={UserCheck} label="Active Subscriptions" value={stats?.activeSubs ?? 0} accent="#10b981" />
        <KpiCard icon={TrendingUp} label="New Signups (7d)" value={stats?.newSignupsThisWeek ?? 0} accent="#f59e0b" />
        <KpiCard icon={ShieldCheck} label="Trial → Paid" value={`${conversion?.conversionRate ?? 0}%`} sublabel={`${conversion?.convertedTrials ?? 0} of ${conversion?.totalTrials ?? 0}`} accent="#7c3aed" />
        <KpiCard icon={Building2} label="Expiring Soon" value={stats?.expiringSoon ?? 0} accent="#f59e0b" />
        <KpiCard icon={Building2} label="Suspended Venues" value={stats?.suspendedVenues ?? 0} accent="#ef4444" />
      </div>

      {/* ── MRR + signup trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {!mrrLoading && (
          <Card title="MRR Trend (6 Months)">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={mrrTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
        {!signupLoading && (
          <Card title="Venue Signup Trend (6 Months)">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={signupTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="signups" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* ── Churn + subscription status + trial conversion ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ChurnChart churnRate={churn?.churnRate} />
        {!subLoading && <DonutBreakdown title="Subscription Status" data={subStatusData} />}
        {!gstLoading && <DonutBreakdown title="GST Adoption" data={gstData} colors={["#10b981", "#e5e7eb"]} />}
      </div>

      {/* ── Revenue by plan + payment methods ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {!planLoading && (
          <Card title="Active MRR by Plan">
            {(revByPlan || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-14">No active subscriptions yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revByPlan}>
                  <XAxis dataKey="planName" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}
        {!pmLoading && <DonutBreakdown title="Payment Methods (Revenue Share)" data={paymentMethodData} />}
      </div>

      {/* ── Distribution by city ── */}
      <Card title="Venues by City" className="mb-6">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={distribution?.byCity}>
            <XAxis dataKey="city" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Top venues leaderboard ── */}
      {!topLoading && (
        <Card title="Top Venues This Month (by Booking Revenue)">
          {(topVenues || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No bookings recorded this month yet</p>
          ) : (
            <div className="space-y-3">
              {topVenues.map((v, idx) => (
                <div key={v.venueId} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{v.hallName}</p>
                      <p className="text-xs text-gray-400">{v.city}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900">{formatCurrency(v.revenue)}</p>
                    <p className="text-xs text-gray-400">{v.bookingCount} bookings</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </DashboardLayout>
  );
}