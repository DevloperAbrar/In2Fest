import React from "react";
import { Link } from "react-router-dom";
import { Users, UserCheck, Clock, UserX, Wallet, AlertCircle, ArrowRight, CalendarCheck, CheckCircle2, Circle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import { LibraryPage, Panel, Meter, useLib, inr, fmtDate, shiftRange } from "./libraryShared.jsx";

function Tile({ icon: Icon, label, value, sub, tone = "bg-navy-50 text-navy-600" }) {
  return (
    <Panel className="p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}><Icon size={18} /></div>
      <p className="mt-3 text-[12px] text-navy-400">{label}</p>
      <p className="font-display text-2xl font-bold text-navy-900 tabular-nums">{value}</p>
      {sub && <p className="text-[11.5px] text-navy-400 mt-0.5">{sub}</p>}
    </Panel>
  );
}

const SERIES = [
  { key: "new", label: "New joinings", color: "#10b981" },
  { key: "renewal", label: "Renewals", color: "#2563eb" },
  { key: "other", label: "Other", color: "#cbd0de" }
];

export default function LibraryDashboard() {
  const { vid } = useLib();
  const { data, loading, error, refetch } = useFetch(vid ? `/venues/${vid}/library/dashboard` : null, { skip: !vid });

  if (loading || !data) {
    return <LibraryPage title="Library"><div className="py-16">{error ? <p className="text-center text-sm text-red-500">{error}</p> : <Loader />}</div></LibraryPage>;
  }
  const { setup, students: st, collection: col, seats, attendance: at } = data;
  const needSetup = setup.halls === 0 || setup.shifts === 0;

  return (
    <LibraryPage title="Library" subtitle="Your reading room at a glance"
      actions={<Link to="/dashboard/library/students" className="hidden md:inline-flex px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium">Students</Link>}>
      {needSetup && (
        <Panel className="p-4 mb-4 border-primary-200 bg-primary-50/40">
          <p className="font-semibold text-navy-900 mb-2">Set up your library in 3 steps</p>
          {[
            [setup.halls > 0, "Create your halls / rooms", "/dashboard/library/halls"],
            [setup.shifts > 0, "Create your shifts and prices", "/dashboard/library/shifts"],
            [setup.students > 0, "Add your first student", "/dashboard/library/students"]
          ].map(([done, label, to]) => (
            <Link key={label} to={to} className="flex items-center gap-2.5 py-1.5 text-sm text-navy-700 hover:text-primary-700">
              {done ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className="text-navy-300" />}
              <span className={done ? "line-through text-navy-400" : ""}>{label}</span><ArrowRight size={14} className="ml-auto" />
            </Link>
          ))}
        </Panel>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Tile icon={Users} label="Total students" value={st.total - st.left} sub={`${st.new_this_month} joined this month`} tone="bg-violet-50 text-violet-600" />
        <Tile icon={UserCheck} label="Active" value={st.active} sub={`${st.frozen} frozen`} tone="bg-emerald-50 text-emerald-600" />
        <Tile icon={Clock} label="Expiring in 7 days" value={st.expiring} tone="bg-amber-50 text-amber-600" />
        <Tile icon={UserX} label="Expired" value={st.expired} sub="Waiting for renewal" tone="bg-red-50 text-red-600" />
        <Tile icon={AlertCircle} label="Pending dues" value={inr(st.dues_total)} sub={`${st.dues_count} students`} tone="bg-sky-50 text-sky-600" />
        <Tile icon={Wallet} label="Collected this month" value={inr(col.month)} sub={`Today ${inr(col.today)} · Last month ${inr(col.last_month)}`} tone="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Panel className="p-4 lg:col-span-2">
          <p className="font-semibold text-navy-900 mb-3">Collection (last 6 months)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={col.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} />
                <Tooltip formatter={(v) => inr(v)} />
                {SERIES.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="p-4">
          <p className="font-semibold text-navy-900 mb-3">Today's attendance</p>
          {at.off_reason ? <p className="text-sm text-amber-600">Closed today: {at.off_reason}</p> : (
            <>
              <p className="font-display text-3xl font-bold text-navy-900 tabular-nums">{at.present_today}<span className="text-lg text-navy-400"> / {at.expected_today}</span></p>
              <p className="text-[12px] text-navy-400 mb-2">present · {at.inside_now} inside now</p>
              <Meter percent={at.expected_today ? Math.round((at.present_today / at.expected_today) * 100) : 0} />
            </>
          )}
          <Link to="/dashboard/library/attendance" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-600 font-medium"><CalendarCheck size={15} /> Open attendance</Link>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Panel className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-navy-900">Seat occupancy by shift</p>
            <span className="text-[12px] text-navy-400">{seats.total_seats} seats · {seats.percent}% sold</span>
          </div>
          {seats.shifts.length === 0 ? <p className="text-sm text-navy-400">Create shifts to see occupancy.</p> : seats.shifts.map((s) => (
            <div key={s.id} className="mb-3 last:mb-0">
              <div className="flex justify-between text-[13px] mb-1"><span className="font-medium text-navy-800">{s.name} <span className="text-navy-400 font-normal">{shiftRange(s)}</span></span><span className="text-navy-500">{s.occupied}/{s.total} · <b className="text-emerald-600">{s.free} free</b></span></div>
              <Meter percent={s.percent} />
            </div>
          ))}
        </Panel>
        <Panel className="p-4">
          <p className="font-semibold text-navy-900 mb-3">Halls</p>
          {seats.halls.length === 0 ? <p className="text-sm text-navy-400">No halls yet.</p> : seats.halls.map((h) => (
            <div key={h.id} className="flex items-center justify-between py-2 border-b border-navy-50 last:border-0 text-sm">
              <span className="font-medium text-navy-800">{h.name}</span><span className="text-navy-500">{h.seats_used} of {h.total_seats} seats in use</span>
            </div>
          ))}
          <p className="font-semibold text-navy-900 mt-4 mb-2">Revenue by shift (this month)</p>
          {data.revenue_by_shift.length === 0 ? <p className="text-sm text-navy-400">No payments yet this month.</p> : data.revenue_by_shift.map((r) => (
            <div key={r.shift_name} className="flex justify-between text-sm py-1"><span className="text-navy-700">{r.shift_name}</span><b className="text-navy-900">{inr(r.total)}</b></div>
          ))}
        </Panel>
      </div>

      {data.books && (
        <Panel className="p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-navy-900">Books</p>
            <Link to="/dashboard/library/books" className="text-[13px] text-primary-600 font-medium">Open books</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {[["Titles", data.books.titles, "text-navy-900"], ["Copies", data.books.copies, "text-navy-900"], ["Issued", data.books.issued, "text-sky-600"], ["Overdue", data.books.overdue, "text-red-600"]].map(([l, v, c]) => (
              <div key={l}><p className={`font-display text-2xl font-bold tabular-nums ${c}`}>{v}</p><p className="text-[12px] text-navy-400">{l}</p></div>
            ))}
          </div>
          {data.books.fines_due > 0 && <p className="mt-3 text-[13px] text-amber-700">Fines pending: <b>{inr(data.books.fines_due)}</b></p>}
        </Panel>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {[["Expiring soon", data.expiring, "end"], ["Pending dues", data.dues, "due"]].map(([title, list, kind]) => (
          <Panel key={title} className="p-4">
            <p className="font-semibold text-navy-900 mb-2">{title}</p>
            {list.length === 0 ? <p className="text-sm text-navy-400">Nothing here.</p> : list.map((s) => (
              <Link key={s.id} to={`/dashboard/library/students/${s.id}`} className="flex items-center justify-between py-2 border-b border-navy-50 last:border-0 text-sm hover:bg-navy-50/50 rounded">
                <span className="min-w-0"><span className="block font-medium text-navy-800 truncate">{s.name}</span><span className="text-[11.5px] text-navy-400">{s.student_code}</span></span>
                <span className="text-right text-[12.5px] text-navy-600">{kind === "end" ? `${fmtDate(s.end_date)} (${s.days_left}d)` : inr(s.balance_due)}</span>
              </Link>
            ))}
          </Panel>
        ))}
        <Panel className="p-4">
          <p className="font-semibold text-navy-900 mb-2">Recent payments</p>
          {data.recent_payments.length === 0 ? <p className="text-sm text-navy-400">No payments yet.</p> : data.recent_payments.map((p) => (
            <Link key={p.id} to={`/dashboard/library/students/${p.student_id}`} className="flex items-center justify-between py-2 border-b border-navy-50 last:border-0 text-sm">
              <span className="min-w-0"><span className="block font-medium text-navy-800 truncate">{p.student_name}</span><span className="text-[11.5px] text-navy-400">{p.receipt_no} · {fmtDate(p.paid_on)}</span></span>
              <b className="text-emerald-600">{inr(p.amount)}</b>
            </Link>
          ))}
        </Panel>
      </div>
      <button type="button" onClick={refetch} className="sr-only">Refresh</button>
    </LibraryPage>
  );
}