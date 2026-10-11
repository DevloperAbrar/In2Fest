import React from "react";
import { Link } from "react-router-dom";
import { Store, Eye, Inbox, MessageSquare } from "lucide-react";
import Card from "../../../components/common/Card";
import { useFetch } from "../../../hooks/useFetch";
import { formatDate } from "../../../lib/formatters";
import { AdminPage, KpiGrid, BarList, EmptyLine, RefreshButton, formatNumber } from "./OverviewParts.jsx";

function Funnel({ stages }) {
  const top = Math.max(stages[0]?.count || 0, 1);
  return (
    <div className="space-y-4">
      {stages.map((stage, i) => {
        const prev = i > 0 ? stages[i - 1].count : null;
        const fromPrev = prev ? Math.round((stage.count / prev) * 100) : null;
        return (
          <div key={stage.label}>
            <div className="flex justify-between items-baseline text-sm mb-1 gap-2">
              <span className="text-navy-700 font-medium">{stage.label}</span>
              <span className="text-navy-900 font-semibold">
                {formatNumber(stage.count)}
                {fromPrev !== null && <span className="ml-2 text-xs font-normal text-navy-400">{fromPrev}% of previous step</span>}
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${(stage.count / top) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AccessRow({ label, blocked, total }) {
  const pct = total > 0 ? Math.round((blocked / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className="font-semibold text-gray-900">{blocked} of {total} ({pct}%)</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function MarketplaceOverview() {
  const { data, loading, error, refetch } = useFetch("/admin/overview/marketplace");

  const fl = data?.free_listings;
  const listed = data?.funnel?.[3]?.count ?? 0;

  return (
    <AdminPage
      title="Marketplace Overview"
      loading={loading && !data}
      error={!data ? error : null}
      onRetry={refetch}
      action={<RefreshButton onClick={refetch} loading={loading} />}
    >
      {data && (
        <div className="space-y-6">
          <KpiGrid
            items={[
              { icon: Store, label: "Listed vendors", value: formatNumber(listed), sublabel: `${data.demand.active_vendor_pct}% got an inquiry in 30d`, accent: "#7c3aed" },
              { icon: Inbox, label: "Marketplace inquiries (30d)", value: formatNumber(data.demand.marketplace_inquiries_30d), sublabel: `${data.demand.subdomain_inquiries_30d} via vendor websites`, accent: "#3b82f6" },
              { icon: Eye, label: "Free-listing views", value: formatNumber(fl.views), sublabel: `${formatNumber(fl.inquiries)} inquiries`, accent: "#10b981" },
              { icon: MessageSquare, label: "Reviews pending", value: formatNumber(data.reviews.pending), sublabel: `${data.reviews.approved} approved · ${data.reviews.rejected} rejected`, accent: "#f59e0b", to: "/admin/discovery/reviews" }
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Vendor journey: sign-up to paying">
              <Funnel stages={data.funnel} />
              <p className="text-xs text-navy-400 mt-4">
                Shows where vendors drop off. A large gap before "Profile complete" means onboarding needs help.
              </p>
            </Card>

            <Card
              title="Free listings"
              action={<Link to="/admin/discovery/free-listings" className="text-xs font-semibold text-primary-600 hover:underline">Manage</Link>}
            >
              <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                <div className="bg-amber-50 rounded-xl py-3"><p className="text-xl font-display font-bold text-amber-700">{fl.pending}</p><p className="text-[11px] text-amber-700">Pending</p></div>
                <div className="bg-green-50 rounded-xl py-3"><p className="text-xl font-display font-bold text-green-700">{fl.active}</p><p className="text-[11px] text-green-700">Approved</p></div>
                <div className="bg-gray-50 rounded-xl py-3"><p className="text-xl font-display font-bold text-gray-600">{fl.rejected}</p><p className="text-[11px] text-gray-600">Rejected</p></div>
              </div>
              {fl.pending > 0 && fl.oldest_pending_at && (
                <p className="text-xs text-amber-700 mb-3">Oldest pending request is from {formatDate(fl.oldest_pending_at)}.</p>
              )}
              <p className="text-xs font-semibold text-navy-500 mb-2">Most viewed approved listings</p>
              {fl.top.length === 0 ? (
                <EmptyLine>No approved free listings yet</EmptyLine>
              ) : (
                <div className="space-y-2">
                  {fl.top.map((l) => (
                    <div key={l.id} className="flex justify-between text-sm gap-3">
                      <span className="text-gray-700 truncate">{l.business_name}</span>
                      <span className="text-gray-400 flex-shrink-0">{formatNumber(l.profile_views)} views · {l.inquiry_count} inquiries</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card
            title="What listed vendors can offer visitors today"
            action={<Link to="/admin/plans" className="text-xs font-semibold text-primary-600 hover:underline">Edit plans</Link>}
          >
            {data.plan_access.listed === 0 ? (
              <EmptyLine>No listed vendors yet</EmptyLine>
            ) : (
              <div className="space-y-4">
                <AccessRow label="Cannot receive inquiries" blocked={data.plan_access.cannot_inquire} total={data.plan_access.listed} />
                <AccessRow label="No availability calendar" blocked={data.plan_access.cannot_show_calendar} total={data.plan_access.listed} />
                <AccessRow label="Reviews hidden" blocked={data.plan_access.cannot_show_reviews} total={data.plan_access.listed} />
                <p className="text-xs text-navy-400">
                  These vendors are visible on the marketplace but their plan does not include the feature. They are the easiest upgrade conversations.
                </p>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Listed vendors by category"><BarList rows={data.listed_by_category} color="#7c3aed" /></Card>
            <Card title="Listed vendors by city"><BarList rows={data.listed_by_city} color="#3b82f6" /></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Supply without demand">
              <p className="text-3xl font-display font-bold text-navy-900">{formatNumber(data.demand.listed_never_inquired)}</p>
              <p className="text-sm text-navy-500 mt-1">listed vendors have never received an inquiry.</p>
            </Card>
            <Card
              title="Cities people are asking for"
              action={<Link to="/admin/discovery/city-requests" className="text-xs font-semibold text-primary-600 hover:underline">Open</Link>}
            >
              <BarList rows={data.city_demand.map((c) => ({ label: c.city, count: c.count }))} color="#f59e0b" emptyText="No pending city requests" />
            </Card>
          </div>
        </div>
      )}
    </AdminPage>
  );
}