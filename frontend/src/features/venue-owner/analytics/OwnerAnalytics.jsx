import React from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import Card from "../../../components/common/Card";
import Loader from "../../../components/common/Loader";
import KpiCard from "../../../components/common/KpiCard";
import DonutBreakdown from "../../../components/common/DonutBreakdown";
import FunnelBars from "../../../components/common/FunnelBars";
import SlotPopularityChart from "./SlotPopularityChart.jsx";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { formatCurrency } from "../../../lib/formatters";
import {
  Wallet, CalendarCheck, TrendingUp, Clock, IndianRupee, Users, Star, Repeat
} from "lucide-react";

export default function OwnerAnalytics() {
  const { venue } = useVenue();
  const vId = venue?.id;

  const { data: analytics, loading } = useFetch(vId ? `/analytics/owner/${vId}` : null, { skip: !vId });
  const { data: slotPopularity, loading: slotLoading } = useFetch(vId ? `/analytics/owner/${vId}/slot-popularity` : null, { skip: !vId });
  const { data: funnel, loading: funnelLoading } = useFetch(vId ? `/analytics/owner/${vId}/inquiry-funnel` : null, { skip: !vId });
  const { data: bookingStatus, loading: bsLoading } = useFetch(vId ? `/analytics/owner/${vId}/booking-status` : null, { skip: !vId });
  const { data: revByEvent, loading: revLoading } = useFetch(vId ? `/analytics/owner/${vId}/revenue-by-event-type` : null, { skip: !vId });
  const { data: inquirySource, loading: srcLoading } = useFetch(vId ? `/analytics/owner/${vId}/inquiry-source` : null, { skip: !vId });
  const { data: paymentTrend, loading: payLoading } = useFetch(vId ? `/analytics/owner/${vId}/payment-collection` : null, { skip: !vId });
  const { data: reviewStats, loading: reviewLoading } = useFetch(vId ? `/analytics/owner/${vId}/review-stats` : null, { skip: !vId });
  const { data: topClients, loading: clientsLoading } = useFetch(vId ? `/analytics/owner/${vId}/top-clients` : null, { skip: !vId });
  const { data: weekday, loading: weekdayLoading } = useFetch(vId ? `/analytics/owner/${vId}/bookings-by-weekday` : null, { skip: !vId });

  if (loading) return <Loader fullScreen />;

  const bookingStatusData = (bookingStatus || []).map((s) => ({ label: s.status, value: +s.count }));
  const inquirySourceData = (inquirySource || []).map((s) => ({ label: s.source, value: +s.count }));

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Analytics">
      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={IndianRupee} label="Monthly Revenue" value={formatCurrency(analytics?.monthlyRevenue)} accent="#7c3aed" />
        <KpiCard icon={CalendarCheck} label="Monthly Bookings" value={analytics?.monthlyBookings ?? 0} accent="#3b82f6" />
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

      {/* ── Revenue trend + payment collection ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="6-Month Revenue Trend">
          {(analytics?.revenueTrend || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-14">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={analytics?.revenueTrend || []}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {!payLoading && (
          <Card title="Payment Collection (Received vs Pending)">
            {(paymentTrend || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-14">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={paymentTrend || []}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="received" name="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}
      </div>

      {/* ── Inquiry funnel + booking status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {!funnelLoading && <FunnelBars title="Inquiry Funnel" stages={funnel || []} accent={venue?.theme_color || "#7c3aed"} />}
        {!bsLoading && <DonutBreakdown title="Booking Status" data={bookingStatusData} />}
      </div>

      {/* ── Revenue by event type + inquiry source ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {!revLoading && (
          <Card title="Revenue by Event Type">
            {(revByEvent || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-14">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revByEvent || []} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="event_type" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}
        {!srcLoading && <DonutBreakdown title="Inquiry Source" data={inquirySourceData} colors={["#7c3aed", "#f59e0b"]} />}
      </div>

      {/* ── Slot popularity + peak days ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {!slotLoading && <SlotPopularityChart data={slotPopularity || []} />}
        {!weekdayLoading && (
          <Card title="Peak Booking Days">
            {(weekday || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-14">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weekday || []}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}
      </div>

      {/* ── Review distribution + top clients ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!reviewLoading && (
          <Card title="Rating Distribution">
            {!reviewStats || reviewStats?.totalReviews === 0 || (reviewStats?.distribution || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-14">No reviews yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={reviewStats?.distribution || []} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="star" tick={{ fontSize: 12 }} width={40} tickFormatter={(v) => `${v}★`} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}

        {!clientsLoading && (
          <Card title="Top Clients by Value">
            {(topClients || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-14">No clients yet</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone}{c.event_type ? ` · ${c.event_type}` : ""}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-gray-900">{formatCurrency(c.total_business_value)}</p>
                      {+c.pending_balance > 0 && (
                        <p className="text-xs text-amber-600">{formatCurrency(c.pending_balance)} due</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}