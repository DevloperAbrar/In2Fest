import React from "react";
import { Link } from "react-router-dom";
import { Users, Clock, UserX, Wallet, TrendingUp, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import KpiCard from "../../../components/common/KpiCard";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, StatusPill, inr, fmtDate, errMsg, downloadBlob } from "./gymShared.jsx";

export default function GymDashboard() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data: d, loading, refetch } = useFetch(vid ? `/venues/${vid}/gym/dashboard` : null, { skip: !vid });

  const run = async (fn, ok) => {
    try { await fn(); showSuccess(ok); refetch(); } catch (e) { showError(errMsg(e)); }
  };
  const exportList = async (status) => {
    try {
      const r = await gymService.exportMembers(vid, { status });
      downloadBlob(r.data, `gym-members-${status}.csv`);
    } catch { showError("Could not download the list"); }
  };

  if (loading || !d) return <GymPage title="Gym Overview"><Loader /></GymPage>;
  const c = d.counts;

  return (
    <GymPage title="Gym Overview" subtitle="Members, renewals and collections at a glance">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard icon={Users} label="Active members" value={c.active} sublabel={`${c.new_this_month} joined this month`} accent="#16a34a" />
        <KpiCard icon={Clock} label="Expiring in 7 days" value={c.expiring} accent="#d97706" />
        <KpiCard icon={UserX} label="Expired" value={c.expired} sublabel={`${c.frozen} frozen`} accent="#dc2626" />
        <KpiCard icon={Wallet} label="Pending dues" value={inr(c.dues_total)} sublabel={`${c.dues_count} members`} accent="#7c3aed" />
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <Card title="This month's collection">
          <p className="text-2xl font-bold text-gray-900">{inr(d.revenue.this_month)}</p>
          <p className="text-xs text-gray-500 mt-1">Last month: {inr(d.revenue.last_month)}</p>
        </Card>
        <Card title="Renewal rate (30 days)">
          <p className="text-2xl font-bold text-gray-900 flex items-center gap-2"><TrendingUp size={20} className="text-green-600" />{d.renewal_rate == null ? "-" : `${d.renewal_rate}%`}</p>
          <p className="text-xs text-gray-500 mt-1">{d.renewals_due_30d} memberships ended in the last 30 days</p>
        </Card>
        <Card title="Free-trial leads">
          <p className="text-2xl font-bold text-gray-900">{d.new_leads}</p>
          <Link to="/dashboard/gym/leads" className="text-xs text-primary-600 font-medium">View leads →</Link>
        </Card>
      </div>

      <Card title="Collections (last 6 months)" className="mb-4">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.revenue_series}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={50} />
              <Tooltip formatter={(v) => inr(v)} />
              <Legend />
              <Bar dataKey="new" name="New joinings" stackId="a" fill="#16a34a" />
              <Bar dataKey="renewal" name="Renewals" stackId="a" fill="#2563eb" />
              <Bar dataKey="other" name="Other" stackId="a" fill="#9ca3af" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {d.pending_payments.length > 0 && (
        <Card title={`Payments to confirm (${d.pending_payments.length})`} className="mb-4">
          <div className="divide-y">
            {d.pending_payments.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/dashboard/gym/members/${p.member?.id}`} className="font-medium text-sm text-gray-900 truncate block">{p.member?.name}</Link>
                  <p className="text-xs text-gray-500">{inr(p.amount)} · {p.mode.toUpperCase()}{p.meta?.claimed_at ? " · member says paid" : ""}</p>
                </div>
                <div className="flex gap-2">
                  {p.rzp_link_id && <Button variant="outline" onClick={() => run(() => gymService.refreshPayment(vid, p.id), "Checked")}>Check</Button>}
                  {!p.rzp_link_id && <Button onClick={() => run(() => gymService.confirmPayment(vid, p.id), "Payment confirmed")}>Confirm</Button>}
                  <Button variant="outline" onClick={() => run(() => gymService.cancelPayment(vid, p.id), "Cancelled")}>Cancel</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <Card title="Expiring this week" action={d.expiring_list.length > 0 && <Button variant="outline" onClick={() => exportList("expiring")}><Download size={14} /> Download list</Button>}>
          {d.expiring_list.length === 0 ? <p className="text-sm text-gray-400">No one is expiring this week.</p> : (
            <div className="divide-y">
              {d.expiring_list.map((m) => (
                <Link key={m.id} to={`/dashboard/gym/members/${m.id}`} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{m.name}</p><p className="text-xs text-gray-500">{m.plan_name} · {fmtDate(m.end_date)}</p></div>
                  <StatusPill status={m.display_status} daysLeft={m.days_left} />
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card title="Pending dues" action={d.dues_list.length > 0 && <Button variant="outline" onClick={() => exportList("dues")}><Download size={14} /> Download list</Button>}>
          {d.dues_list.length === 0 ? <p className="text-sm text-gray-400">No pending dues.</p> : (
            <div className="divide-y">
              {d.dues_list.map((m) => (
                <Link key={m.id} to={`/dashboard/gym/members/${m.id}`} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{m.name}</p><p className="text-xs text-gray-500">{m.plan_name}</p></div>
                  <span className="text-sm font-semibold text-red-600">{inr(m.balance_due)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </GymPage>
  );
}