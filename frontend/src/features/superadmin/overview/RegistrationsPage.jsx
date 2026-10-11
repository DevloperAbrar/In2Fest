import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import { useFetch } from "../../../hooks/useFetch";
import { formatDate, formatDateTime, formatCurrency, formatSlugLabel } from "../../../lib/formatters";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { ErrorPanel, EmptyLine, formatNumber } from "./OverviewParts.jsx";

const TABS = [
  { key: "vendors", label: "Vendors", countKey: "vendors" },
  { key: "no_business", label: "Signed up, no business", countKey: "no_business" },
  { key: "visitors", label: "Visitors", countKey: "visitors" }
];
const STATUS_OPTIONS = ["trial", "active", "expiring_soon", "expired", "suspended"];

const selectClass =
  "text-sm border border-navy-100 rounded-xl px-3 py-2 bg-white text-navy-700 focus:outline-none focus:ring-2 focus:ring-primary-200";

function Th({ children, className = "" }) {
  return (
    <th className={`text-left text-[11px] font-semibold uppercase tracking-wide text-navy-400 px-3 py-2.5 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`px-3 py-3 text-sm text-navy-700 align-top ${className}`}>{children}</td>;
}

export default function RegistrationsPage() {
  const [params, setParams] = useSearchParams();
  const type = TABS.some((t) => t.key === params.get("type")) ? params.get("type") : "vendors";
  const plan = params.get("plan") || "";
  const status = params.get("status") || "";
  const listed = params.get("listed") || "";
  const q = params.get("q") || "";
  const page = Math.max(parseInt(params.get("page"), 10) || 1, 1);

  // Search box keeps its own text and updates the URL after the user stops typing.
  const [searchText, setSearchText] = useState(q);
  useEffect(() => setSearchText(q), [q]);
  useEffect(() => {
    if (searchText === q) return undefined;
    const timer = setTimeout(() => update({ q: searchText, page: "" }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  function update(changes) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) next.delete(key);
      else next.set(key, value);
    });
    setParams(next, { replace: true });
  }

  const query = new URLSearchParams({ type, page: String(page), limit: "25" });
  if (q) query.set("search", q);
  if (type === "vendors") {
    if (plan) query.set("plan", plan);
    if (status) query.set("status", status);
    if (listed) query.set("listed", listed);
  }

  const { data, loading, error, refetch } = useFetch(`/admin/overview/registrations?${query.toString()}`);
  const rows = data?.rows || [];
  const pagination = data?.pagination;
  const hasFilters = !!(q || plan || status || listed);

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Registrations">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = tab.key === type;
            return (
              <button
                key={tab.key}
                onClick={() => update({ type: tab.key, page: "", plan: "", status: "", listed: "" })}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  active ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-600 border-navy-100 hover:bg-navy-50"
                }`}
              >
                {tab.label}
                {data?.counts && <span className={`ml-2 text-xs ${active ? "text-navy-200" : "text-navy-400"}`}>{formatNumber(data.counts[tab.countKey])}</span>}
              </button>
            );
          })}
        </div>

        <Card>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={type === "vendors" ? "Search business, owner, email, phone, city..." : "Search name or email..."}
                className="w-full text-sm border border-navy-100 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
                maxLength={100}
              />
            </div>

            {type === "vendors" && (
              <>
                <select className={selectClass} value={plan} onChange={(e) => update({ plan: e.target.value, page: "" })}>
                  <option value="">All plans</option>
                  <option value="none">No plan</option>
                  {(data?.plans || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className={selectClass} value={status} onChange={(e) => update({ status: e.target.value, page: "" })}>
                  <option value="">Any status</option>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{formatSlugLabel(s.replace(/_/g, "-"))}</option>)}
                </select>
                <select className={selectClass} value={listed} onChange={(e) => update({ listed: e.target.value, page: "" })}>
                  <option value="">Listed or not</option>
                  <option value="true">Listed on marketplace</option>
                  <option value="false">Not listed</option>
                </select>
              </>
            )}

            {hasFilters && (
              <button
                onClick={() => { setSearchText(""); update({ q: "", plan: "", status: "", listed: "", page: "" }); }}
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {error && !data ? (
            <ErrorPanel message={error} onRetry={refetch} />
          ) : (
            <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
              {rows.length === 0 && !loading ? (
                <EmptyLine>{hasFilters ? "No results match these filters" : "Nothing here yet"}</EmptyLine>
              ) : type === "vendors" ? (
                <table className="w-full min-w-[860px]">
                  <thead className="border-b border-navy-100">
                    <tr><Th>Business</Th><Th>Owner</Th><Th>Plan</Th><Th>Marketplace</Th><Th>Registered</Th><Th>Last sign-in</Th><Th>{" "}</Th></tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-navy-50/40">
                        <Td>
                          <p className="font-medium text-navy-900">{r.hall_name}</p>
                          <p className="text-xs text-navy-400">
                            {[r.city, r.business_category && formatSlugLabel(r.business_category)].filter(Boolean).join(" · ") || "-"}
                          </p>
                          {!r.is_active && <span className="text-[11px] font-medium text-red-600">Deactivated</span>}
                        </Td>
                        <Td>
                          <p className="truncate max-w-[200px]">{r.owner_email || "-"}</p>
                          {r.phone && <p className="text-xs text-navy-400">{r.phone}</p>}
                        </Td>
                        <Td>
                          {r.plan_name ? (
                            <>
                              <p className="font-medium">{r.plan_name}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <Badge status={r.sub_status} />
                                {r.locked_price > 0 && (
                                  <span className="text-xs text-navy-400">
                                    {formatCurrency(r.locked_price)}/{r.billing_cycle === "yearly" ? "yr" : "mo"}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-red-500 font-medium">No plan</span>
                          )}
                        </Td>
                        <Td><Badge status={r.marketplace_listed ? "listed" : "not_listed"}>{r.marketplace_listed ? "Listed" : "Not listed"}</Badge></Td>
                        <Td className="whitespace-nowrap">{formatDate(r.created_at)}</Td>
                        <Td className="whitespace-nowrap">{r.last_login_at ? formatDateTime(r.last_login_at) : <span className="text-navy-300">Never</span>}</Td>
                        <Td><Link to={`/admin/venues/${r.id}`} className="text-xs font-semibold text-primary-600 hover:underline">View</Link></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : type === "no_business" ? (
                <table className="w-full min-w-[560px]">
                  <thead className="border-b border-navy-100"><tr><Th>Name</Th><Th>Email</Th><Th>Signed up</Th><Th>Last sign-in</Th></tr></thead>
                  <tbody className="divide-y divide-navy-50">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-navy-50/40">
                        <Td className="font-medium text-navy-900">{r.name}{!r.is_active && <span className="ml-2 text-[11px] text-red-600">Deactivated</span>}</Td>
                        <Td>{r.email}</Td>
                        <Td className="whitespace-nowrap">{formatDate(r.created_at)}</Td>
                        <Td className="whitespace-nowrap">{r.last_login_at ? formatDateTime(r.last_login_at) : <span className="text-navy-300">Never</span>}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[620px]">
                  <thead className="border-b border-navy-100"><tr><Th>Name</Th><Th>Email</Th><Th>Joined</Th><Th>Saved vendors</Th><Th>Reviews</Th><Th>Last sign-in</Th></tr></thead>
                  <tbody className="divide-y divide-navy-50">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-navy-50/40">
                        <Td className="font-medium text-navy-900">{r.name}</Td>
                        <Td>{r.email}</Td>
                        <Td className="whitespace-nowrap">{formatDate(r.created_at)}</Td>
                        <Td>{r.saved_count}</Td>
                        <Td>{r.review_count}</Td>
                        <Td className="whitespace-nowrap">{r.last_login_at ? formatDateTime(r.last_login_at) : <span className="text-navy-300">Not tracked yet</span>}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {pagination && pagination.total > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-navy-50">
              <p className="text-xs text-navy-400">
                {formatNumber(pagination.total)} result{pagination.total === 1 ? "" : "s"} · page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => update({ page: String(pagination.page - 1) })}
                  className="p-2 rounded-lg border border-navy-100 text-navy-600 disabled:opacity-40 hover:bg-navy-50"
                  aria-label="Previous page"
                ><ChevronLeft size={15} /></button>
                <button
                  disabled={pagination.page >= pagination.pages || loading}
                  onClick={() => update({ page: String(pagination.page + 1) })}
                  className="p-2 rounded-lg border border-navy-100 text-navy-600 disabled:opacity-40 hover:bg-navy-50"
                  aria-label="Next page"
                ><ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}