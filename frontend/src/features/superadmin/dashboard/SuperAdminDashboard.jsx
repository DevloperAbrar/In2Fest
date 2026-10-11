import React from "react";
import {
  Users, UserPlus, UserX, Eye, LogIn, Activity, CalendarDays, Crown, Gift, Hourglass, Ban,
  IndianRupee, TrendingUp, Wallet, Store, ClipboardCheck, ListTree, MessageSquare, Inbox
} from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import RevenueGraph from "./RevenueGraph.jsx";
import RecentSignups from "./RecentSignups.jsx";
import ExpiringSubscriptions from "./ExpiringSubscriptions.jsx";
import RecentPayments from "./RecentPayments.jsx";
import AttentionQueue from "./AttentionQueue.jsx";
import { AdminPage, KpiGrid, Section, RefreshButton, formatNumber } from "../overview/OverviewParts.jsx";

export default function SuperAdminDashboard() {
  const { data: s, loading, error, refetch } = useFetch("/admin/overview/summary");
  const { data: mrrTrend, loading: trendLoading } = useFetch("/analytics/admin/mrr-trend");
  const { data: summary, loading: summaryLoading } = useFetch("/dashboard/admin/summary");

  const growth = s?.revenue?.growth_pct;
  const growthLabel =
    growth === null || growth === undefined
      ? "no revenue last month"
      : `${growth > 0 ? "+" : ""}${growth}% vs last month`;

  return (
    <AdminPage
      title="Dashboard"
      loading={loading && !s}
      error={!s ? error : null}
      onRetry={refetch}
      action={<RefreshButton onClick={refetch} loading={loading} />}
    >
      {s && (
        <div className="space-y-8">
          <Section title="People" hint="Everyone who has registered on the platform">
            <KpiGrid
              items={[
                { icon: Users, label: "Vendors registered", value: formatNumber(s.accounts.venues_total), sublabel: `+${s.accounts.venues_7d} this week · +${s.accounts.venues_30d} this month`, accent: "#7c3aed", to: "/admin/registrations" },
                { icon: UserX, label: "Signed up, no business yet", value: formatNumber(s.accounts.owners_without_venue), sublabel: "signed in but did not onboard", accent: "#f59e0b", to: "/admin/registrations?type=no_business" },
                { icon: UserPlus, label: "Visitor accounts", value: formatNumber(s.accounts.visitors_total), sublabel: `+${s.accounts.visitors_7d} this week`, accent: "#3b82f6", to: "/admin/registrations?type=visitors" },
                { icon: Users, label: "Team members", value: formatNumber(s.accounts.team_members), sublabel: `${s.accounts.venues_suspended} vendor(s) deactivated`, accent: "#6b7280" }
              ]}
            />
          </Section>

          <Section
            title="Logins"
            hint={
              s.logins.tracking_since
                ? `Counted since ${formatDate(s.logins.tracking_since)}, when login tracking started`
                : "Login tracking is on; numbers appear after the first sign-in"
            }
          >
            <KpiGrid
              items={[
                { icon: LogIn, label: "Logins today", value: formatNumber(s.logins.today), sublabel: "all account types", accent: "#10b981", to: "/admin/logins" },
                { icon: Activity, label: "Active users (24h)", value: formatNumber(s.logins.unique_24h), sublabel: "unique sign-ins", accent: "#10b981", to: "/admin/logins" },
                { icon: CalendarDays, label: "Active users (7d)", value: formatNumber(s.logins.unique_7d), sublabel: `${formatNumber(s.logins.last_7d)} logins`, accent: "#3b82f6", to: "/admin/logins" },
                { icon: CalendarDays, label: "Active users (30d)", value: formatNumber(s.logins.unique_30d), sublabel: `${formatNumber(s.logins.last_30d)} logins`, accent: "#3b82f6", to: "/admin/logins" }
              ]}
            />
          </Section>

          <Section title="Plans & revenue" hint="Paying = active, non-trial plan with a price above zero. Free-plan vendors are shown separately.">
            <KpiGrid
              items={[
                { icon: Crown, label: "Paying vendors", value: formatNumber(s.subscriptions.paying), sublabel: `ARPU ${formatCurrency(s.revenue.arpu)}`, accent: "#10b981", to: "/admin/plan-vendors" },
                { icon: Gift, label: "Free-plan vendors", value: formatNumber(s.subscriptions.free_plan), sublabel: "price 0 plans", accent: "#6b7280", to: "/admin/plan-vendors" },
                { icon: Hourglass, label: "On trial", value: formatNumber(s.subscriptions.trial), sublabel: `${s.subscriptions.trial_ending_3d} ending in 3 days`, accent: "#3b82f6", to: "/admin/registrations?type=vendors&status=trial" },
                { icon: Ban, label: "No plan / expired", value: formatNumber(s.subscriptions.no_subscription + s.subscriptions.expired), sublabel: `${s.subscriptions.no_subscription} without plan · ${s.subscriptions.expired} expired`, accent: "#ef4444", to: "/admin/plan-vendors" },
                { icon: IndianRupee, label: "MRR", value: formatCurrency(s.revenue.mrr), sublabel: "yearly plans counted per month", accent: "#10b981" },
                { icon: TrendingUp, label: "ARR", value: formatCurrency(s.revenue.arr), sublabel: "MRR × 12", accent: "#10b981" },
                { icon: Wallet, label: "Collected this month", value: formatCurrency(s.revenue.this_month), sublabel: growthLabel, accent: "#7c3aed", to: "/admin/payments" },
                { icon: Wallet, label: "Collected all time", value: formatCurrency(s.revenue.total_collected), sublabel: "incl. GST", accent: "#7c3aed", to: "/admin/payments" }
              ]}
            />
          </Section>

          <Section title="Marketplace" hint="Supply (who is listed) and demand (who is enquiring)">
            <KpiGrid
              items={[
                { icon: Store, label: "Listed vendors", value: formatNumber(s.listing.listed), sublabel: `${s.listing.featured} featured on homepage`, accent: "#7c3aed", to: "/admin/marketplace" },
                { icon: ClipboardCheck, label: "Profile complete", value: formatNumber(s.listing.profile_complete), sublabel: "ready for the marketplace", accent: "#10b981", to: "/admin/marketplace" },
                { icon: ListTree, label: "Free listings", value: formatNumber(s.listing.fl_total), sublabel: `${s.listing.fl_pending} pending · ${s.listing.fl_active} approved · ${s.listing.fl_rejected} rejected`, accent: "#f59e0b", to: "/admin/discovery/free-listings" },
                { icon: Inbox, label: "Inquiries (30d)", value: formatNumber(s.demand.inquiries_30d), sublabel: `${s.demand.marketplace_30d} from marketplace`, accent: "#3b82f6", to: "/admin/discovery/analytics" },
                { icon: Inbox, label: "Inquiries (7d)", value: formatNumber(s.demand.inquiries_7d), sublabel: `${formatNumber(s.demand.inquiries_total)} all time`, accent: "#3b82f6" },
                { icon: MessageSquare, label: "Reviews pending", value: formatNumber(s.demand.reviews_pending), sublabel: "awaiting moderation", accent: "#f59e0b", to: "/admin/discovery/reviews" },
                { icon: Eye, label: "City requests", value: formatNumber(s.demand.city_requests_pending), sublabel: "waiting for a launch notice", accent: "#f59e0b", to: "/admin/discovery/city-requests" },
                { icon: MessageSquare, label: "WhatsApp failed (30d)", value: formatNumber(s.demand.whatsapp_failed_30d), sublabel: "platform-wide", accent: "#ef4444", to: "/admin/whatsapp" }
              ]}
            />
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {!trendLoading && <RevenueGraph data={mrrTrend} />}
            </div>
            <AttentionQueue
              pendingReviewModerationCount={s.demand.reviews_pending}
              pendingFreeListingsCount={s.listing.fl_pending}
              whatsappFailedCount={s.demand.whatsapp_failed_30d}
              trialsEndingSoon={s.subscriptions.trial_ending_3d}
              renewalsDue={s.subscriptions.renewals_due_7d}
              pendingCityRequests={s.demand.city_requests_pending}
              failedPayments={s.revenue.failed_payments_30d}
            />
          </div>

          {!summaryLoading && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ExpiringSubscriptions subscriptions={summary?.expiringSubscriptions || []} />
                <RecentSignups venues={summary?.recentSignups || []} />
              </div>
              <RecentPayments payments={summary?.recentPayments || []} />
            </>
          )}
        </div>
      )}
    </AdminPage>
  );
}