import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Store, UserCog, Users, ShieldCheck, Info } from "lucide-react";
import Card from "../../../components/common/Card";
import { useFetch } from "../../../hooks/useFetch";
import { formatDate, formatDateTime, formatCurrency } from "../../../lib/formatters";
import { AdminPage, KpiGrid, EmptyLine, RefreshButton, formatNumber } from "./OverviewParts.jsx";

const RANGES = [7, 14, 30, 90];
const ACTOR_LABEL = { vendor: "Vendor", team_member: "Team member", visitor: "Visitor", super_admin: "Admin" };
const ACTOR_STYLE = {
  vendor: "bg-purple-100 text-purple-700",
  team_member: "bg-blue-100 text-blue-700",
  visitor: "bg-emerald-100 text-emerald-700",
  super_admin: "bg-gray-200 text-gray-700"
};

function shortDate(value) {
  const [, month, day] = String(value).split("-");
  return `${day}/${month}`;
}

export default function LoginActivity() {
  const [days, setDays] = useState(14);
  const { data, loading, error, refetch } = useFetch(`/admin/overview/logins?days=${days}`);

  const stat = (type) => (data?.by_type || []).find((r) => r.actor_type === type) || { logins: 0, unique_users: 0 };
  const vendor = stat("vendor");
  const team = stat("team_member");
  const visitor = stat("visitor");
  const admin = stat("super_admin");

  return (
    <AdminPage
      title="Login Activity"
      loading={loading && !data}
      error={!data ? error : null}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-navy-100 bg-white overflow-hidden">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={`px-3 py-2 text-xs font-medium ${days === r ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-navy-50"}`}
              >
                {r}d
              </button>
            ))}
          </div>
          <RefreshButton onClick={refetch} loading={loading} />
        </div>
      }
    >
      {data && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-800">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <p>
              {data.tracking_since
                ? `Sign-ins are counted from ${formatDate(data.tracking_since)}, when tracking started. Earlier logins are not available.`
                : "Login tracking is on. Sign-ins will appear here after the next login."}{" "}
              A sign-in is a fresh login. Sessions stay valid for up to 30 days, so a vendor can still be using the app without a new sign-in.
            </p>
          </div>

          <KpiGrid
            items={[
              { icon: Store, label: "Vendor sign-ins", value: formatNumber(vendor.logins), sublabel: `${vendor.unique_users} unique vendors`, accent: "#7c3aed" },
              { icon: UserCog, label: "Team member sign-ins", value: formatNumber(team.logins), sublabel: `${team.unique_users} unique members`, accent: "#3b82f6" },
              { icon: Users, label: "Visitor sign-ins", value: formatNumber(visitor.logins), sublabel: `${visitor.unique_users} unique visitors`, accent: "#10b981" },
              { icon: ShieldCheck, label: "Admin sign-ins", value: formatNumber(admin.logins), sublabel: `last ${days} days`, accent: "#6b7280" }
            ]}
          />

          <Card title={`Sign-ins per day (last ${days} days)`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.series}>
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip labelFormatter={shortDate} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="vendor" name="Vendors" stackId="a" fill="#7c3aed" />
                <Bar dataKey="team_member" name="Team members" stackId="a" fill="#3b82f6" />
                <Bar dataKey="visitor" name="Visitors" stackId="a" fill="#10b981" />
                <Bar dataKey="super_admin" name="Admin" stackId="a" fill="#9ca3af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Most active vendors">
              {data.top_vendors.length === 0 ? (
                <EmptyLine>No vendor sign-ins in this period</EmptyLine>
              ) : (
                <div className="space-y-3">
                  {data.top_vendors.map((v, i) => (
                    <div key={v.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{v.hall_name || v.name}</p>
                          <p className="text-xs text-gray-400 truncate">{v.email}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-gray-900">{v.logins} sign-ins</p>
                        <p className="text-xs text-gray-400">last {formatDateTime(v.last_login)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Paying vendors not seen for 14+ days">
              {data.at_risk.length === 0 ? (
                <EmptyLine>Every paying vendor signed in within 14 days</EmptyLine>
              ) : (
                <div className="space-y-3">
                  {data.at_risk.map((v) => (
                    <Link key={v.id} to={`/admin/venues/${v.id}`} className="flex items-center justify-between gap-3 text-sm hover:bg-navy-50/50 rounded-lg -mx-2 px-2 py-1">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{v.hall_name}</p>
                        <p className="text-xs text-gray-400">{v.plan_name} · {formatCurrency(v.locked_price)}/{v.billing_cycle === "yearly" ? "yr" : "mo"}</p>
                      </div>
                      <p className="text-xs text-red-500 font-medium flex-shrink-0">
                        {v.last_login_at ? `last ${formatDate(v.last_login_at)}` : "never signed in"}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="Recent sign-ins">
            {data.recent.length === 0 ? (
              <EmptyLine>No sign-ins recorded yet</EmptyLine>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <tbody className="divide-y divide-navy-50">
                    {data.recent.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 pr-3">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${ACTOR_STYLE[r.actor_type] || "bg-gray-100 text-gray-700"}`}>
                            {ACTOR_LABEL[r.actor_type] || r.actor_type}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-sm text-navy-800">
                          <p className="font-medium">{r.name || "Deleted account"}</p>
                          <p className="text-xs text-navy-400">{[r.email, r.hall_name].filter(Boolean).join(" · ")}</p>
                        </td>
                        <td className="py-2.5 text-xs text-navy-500 text-right whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </AdminPage>
  );
}