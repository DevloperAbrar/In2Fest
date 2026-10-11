import React from "react";
import { Link } from "react-router-dom";
import { Users, IndianRupee, Ban } from "lucide-react";
import Card from "../../../components/common/Card";
import DonutBreakdown from "../../../components/common/DonutBreakdown";
import FunnelBars from "../../../components/common/FunnelBars";
import { useFetch } from "../../../hooks/useFetch";
import { formatCurrency } from "../../../lib/formatters";
import { AdminPage, KpiGrid, RefreshButton, formatNumber } from "./OverviewParts.jsx";

function Th({ children, right }) {
  return (
    <th className={`text-[11px] font-semibold uppercase tracking-wide text-navy-400 px-3 py-2.5 whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
const numCell = "px-3 py-3 text-sm text-navy-700 text-right tabular-nums";

export default function PlanVendors() {
  const { data, loading, error, refetch } = useFetch("/admin/overview/plans");

  const donut = data
    ? [
        ...data.plans.filter((p) => p.vendors > 0).map((p) => ({ label: p.name, value: p.vendors })),
        ...(data.no_subscription > 0 ? [{ label: "No plan", value: data.no_subscription }] : [])
      ]
    : [];

  return (
    <AdminPage
      title="Plan-wise Vendors"
      loading={loading && !data}
      error={!data ? error : null}
      onRetry={refetch}
      action={<RefreshButton onClick={refetch} loading={loading} />}
    >
      {data && (
        <div className="space-y-6">
          <KpiGrid
            cols={3}
            items={[
              { icon: Users, label: "Total vendors", value: formatNumber(data.total_vendors), sublabel: `${data.plans.length} plans`, accent: "#7c3aed" },
              { icon: IndianRupee, label: "MRR", value: formatCurrency(data.total_mrr), sublabel: "paying plans only", accent: "#10b981" },
              {
                icon: Ban, label: "Vendors without a plan", value: formatNumber(data.no_subscription),
                sublabel: "no subscription record", accent: "#ef4444",
                to: "/admin/registrations?type=vendors&plan=none"
              }
            ]}
          />

          <Card title="Vendors by plan">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="border-b border-navy-100">
                  <tr>
                    <Th>Plan</Th><Th right>Vendors</Th><Th right>Active</Th><Th right>Trial</Th>
                    <Th right>Expiring</Th><Th right>Expired</Th><Th right>Suspended</Th>
                    <Th right>Listed</Th><Th right>MRR</Th><Th>{" "}</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {data.plans.map((p) => (
                    <tr key={p.id} className="hover:bg-navy-50/40">
                      <td className="px-3 py-3 text-sm">
                        <p className="font-medium text-navy-900">
                          {p.name}
                          {!p.is_active && <span className="ml-2 text-[11px] font-medium text-gray-400">(inactive)</span>}
                        </p>
                        <p className="text-xs text-navy-400">
                          {p.monthly_price > 0 ? `${formatCurrency(p.monthly_price)}/mo` : "Free"} · {p.features.length} feature{p.features.length === 1 ? "" : "s"}
                        </p>
                      </td>
                      <td className={`${numCell} font-semibold text-navy-900`}>{p.vendors}</td>
                      <td className={numCell}>{p.active}</td>
                      <td className={numCell}>{p.trial}</td>
                      <td className={numCell}>{p.expiring_soon}</td>
                      <td className={numCell}>{p.expired}</td>
                      <td className={numCell}>{p.suspended}</td>
                      <td className={numCell}>{p.listed}</td>
                      <td className={numCell}>{formatCurrency(p.mrr)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        {p.vendors > 0 && (
                          <Link to={`/admin/registrations?type=vendors&plan=${p.id}`} className="text-xs font-semibold text-primary-600 hover:underline">
                            View vendors
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.no_subscription > 0 && (
                    <tr className="bg-red-50/40">
                      <td className="px-3 py-3 text-sm font-medium text-red-600">No plan</td>
                      <td className={`${numCell} font-semibold text-red-600`}>{data.no_subscription}</td>
                      <td className={numCell} colSpan={7} />
                      <td className="px-3 py-3 text-right">
                        <Link to="/admin/registrations?type=vendors&plan=none" className="text-xs font-semibold text-primary-600 hover:underline">View vendors</Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DonutBreakdown title="Vendor share by plan" data={donut} />
            <FunnelBars
              title="Vendors who can use each feature right now"
              stages={data.feature_adoption.map((f) => ({ label: f.label, count: f.vendors }))}
              accent="#10b981"
            />
          </div>
          <p className="text-xs text-navy-400">
            A vendor counts for a feature only while their subscription is live (trial, active or expiring soon) and their plan includes it.
          </p>
        </div>
      )}
    </AdminPage>
  );
}