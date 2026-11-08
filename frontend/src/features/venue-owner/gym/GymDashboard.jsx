import React, { useState } from "react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Clock, UserX, Wallet, Download, RefreshCw, ChevronRight, ArrowRight,
  TrendingUp, TrendingDown, UserPlus, BadgeCheck
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import { ShiftOverviewCard } from "./GymShifts.jsx";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, StatusPill, inr, fmtDate, errMsg, downloadBlob } from "./gymShared.jsx";
import {
  AnimatedNumber, EmptyState, GymSkeleton, InitialsAvatar, ProgressRing, SectionTitle,
  Sparkline, StatTile, Surface, TONES, fadeUp, stagger
} from "./gymUi.jsx";

const SERIES = [
  { key: "new", label: "New joinings", color: "#10b981" },
  { key: "renewal", label: "Renewals", color: "#2563eb" },
  { key: "other", label: "Other", color: "#cbd0de" }
];

const compact = (v) => (v >= 100000 ? `${Math.round(v / 1000) / 100}L` : v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`);
const monthTotal = (s) => (Number(s.new) || 0) + (Number(s.renewal) || 0) + (Number(s.other) || 0);

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-xl bg-navy-900 text-white px-3 py-2.5 shadow-card min-w-[150px]">
      <p className="text-[11px] text-white/60">{label}</p>
      <p className="font-display font-semibold text-sm tabular-nums mb-1.5">{inr(total)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-3 text-[11px] text-white/80">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
            {p.name}
          </span>
          <span className="tabular-nums">{inr(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// Desktop / tablet stat (unchanged)
function MiniStat({ label, children }) {
  return (
    <div className="flex-1 min-w-0 px-3 first:pl-0 last:pr-0">
      <p className="text-[11px] text-white/55 truncate">{label}</p>
      <p className="mt-0.5 font-display font-semibold text-[15px] md:text-base text-white truncate tabular-nums">{children}</p>
    </div>
  );
}

// Mobile stat tile
function GlassStat({ label, children }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/[0.07] ring-1 ring-inset ring-white/10 px-3 py-2.5">
      <p className="text-[10.5px] leading-tight text-white/55 line-clamp-2 min-h-[26px]">{label}</p>
      <p className="mt-1 font-display font-semibold text-[15px] text-white truncate tabular-nums">{children}</p>
    </div>
  );
}

function Hero({ d, c, series }) {
  const thisMonth = Number(d.revenue.this_month) || 0;
  const lastMonth = Number(d.revenue.last_month) || 0;
  const delta = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  const up = delta !== null && delta >= 0;
  const trend = series.map(monthTotal);
  const months = series.map((s) => {
    const m = dayjs(`${s.month}-01`);
    return m.isValid() ? m.format("MMM") : "";
  });

  const activeStat = <AnimatedNumber value={Number(c.active) || 0} />;
  const renewalStat =
    d.renewal_rate == null ? "-" : <AnimatedNumber value={Number(d.renewal_rate) || 0} format={(v) => `${Math.round(v)}%`} />;
  const enquiryStat = <AnimatedNumber value={Number(d.new_leads) || 0} />;

  return (
    <motion.section
      variants={fadeUp}
      className="relative overflow-hidden rounded-[28px] md:rounded-3xl bg-gradient-to-br from-navy-700 via-navy-800 to-navy-900 text-white p-5 md:p-7 shadow-card"
    >
      <svg className="absolute -right-10 -top-16 w-72 h-72 text-white pointer-events-none" viewBox="0 0 200 200" fill="none" aria-hidden="true">
        {[30, 52, 74, 96].map((r, i) => (
          <circle key={r} cx="100" cy="100" r={r} stroke="currentColor" strokeOpacity={0.09 - i * 0.015} strokeWidth="1" />
        ))}
      </svg>
      <div className="absolute -left-16 -bottom-20 w-56 h-56 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />

      <div className="relative">
        <p className="text-[12px] text-white/60">This month's collection</p>
        <div className="mt-1.5 md:flex md:items-end md:justify-between md:gap-4">
          <div className="min-w-0">
            <p className="font-display font-bold text-[36px] md:text-[40px] leading-none tabular-nums truncate">
              <AnimatedNumber value={thisMonth} format={(v) => inr(Math.round(v))} />
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-medium">
              {delta !== null && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${up ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                  {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {up ? "+" : ""}{delta}%
                </span>
              )}
              <span className="text-white/55">Last month: {inr(lastMonth)}</span>
            </div>
          </div>
          {/* Desktop / tablet: sparkline on the right (unchanged) */}
          <Sparkline values={trend} className="hidden md:block w-44 h-16 shrink-0" />
        </div>

        {/* Mobile: full-width trend line */}
        <div className="md:hidden mt-4">
          <Sparkline values={trend} width={320} height={64} className="w-full h-16" />
          {months.length > 1 && (
            <div className="mt-1 flex justify-between px-1 text-[10px] text-white/40">
              <span>{months[0]}</span>
              <span>{months[months.length - 1]}</span>
            </div>
          )}
        </div>

        {/* Mobile: three separate stat tiles */}
        <div className="md:hidden mt-4 grid grid-cols-3 gap-2">
          <GlassStat label="Active members">{activeStat}</GlassStat>
          <GlassStat label="Renewal rate">{renewalStat}</GlassStat>
          <GlassStat label="New enquiries">{enquiryStat}</GlassStat>
        </div>

        {/* Desktop / tablet: divided row (unchanged) */}
        <div className="hidden md:flex mt-6 pt-4 border-t border-white/10 divide-x divide-white/10">
          <MiniStat label="Active members">{activeStat}</MiniStat>
          <MiniStat label="Renewal rate">{renewalStat}</MiniStat>
          <MiniStat label="New enquiries">{enquiryStat}</MiniStat>
        </div>
      </div>
    </motion.section>
  );
}

// Mobile only: one bar that shows how the members are split.
// "active" from the server already includes the ones expiring soon, so we split them apart here.
function MemberHealth({ c }) {
  const expiring = Number(c.expiring) || 0;
  const running = Math.max((Number(c.active) || 0) - expiring, 0);
  const expired = Number(c.expired) || 0;
  const frozen = Number(c.frozen) || 0;
  const total = running + expiring + expired + frozen;
  const parts = [
    { key: "running", label: "Active", value: running, bar: "bg-emerald-500" },
    { key: "expiring", label: "Expiring soon", value: expiring, bar: "bg-amber-400" },
    { key: "expired", label: "Expired", value: expired, bar: "bg-primary-500" },
    { key: "frozen", label: "Frozen", value: frozen, bar: "bg-sky-400" }
  ];
  return (
    <motion.div variants={fadeUp} className="md:hidden">
      <Surface className="p-4">
        <SectionTitle title="Member health" hint={`${total} member${total === 1 ? "" : "s"} in total`} />
        {total === 0 ? (
          <p className="text-xs text-navy-400">Add your first member to see this.</p>
        ) : (
          <>
            <div className="flex h-3 gap-0.5 rounded-full overflow-hidden bg-navy-100">
              {parts.filter((p) => p.value > 0).map((p) => (
                <div key={p.key} className={p.bar} style={{ width: `${(p.value / total) * 100}%` }} />
              ))}
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {parts.map((p) => (
                <div key={p.key} className="flex items-center gap-2 text-[12.5px]">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.bar}`} />
                  <span className="text-navy-500 flex-1 truncate">{p.label}</span>
                  <b className="text-navy-900 tabular-nums">{p.value}</b>
                </div>
              ))}
            </div>
          </>
        )}
      </Surface>
    </motion.div>
  );
}

function PersonRow({ to, name, sub, right }) {
  return (
    <Link to={to} className="tap-scale flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-navy-50/70 transition-colors">
      <InitialsAvatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-navy-900 truncate">{name}</p>
        <p className="text-xs text-navy-400 mt-0.5 truncate">{sub}</p>
      </div>
      <div className="shrink-0">{right}</div>
      <ChevronRight size={16} className="text-navy-300 shrink-0 hidden sm:block" />
    </Link>
  );
}

export default function GymDashboard() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data: d, loading, refetch } = useFetch(vid ? `/venues/${vid}/gym/dashboard` : null, { skip: !vid });
  const [busy, setBusy] = useState(null);

  const run = async (key, fn, ok) => {
    setBusy(key);
    try { await fn(); showSuccess(ok); refetch(); } catch (e) { showError(errMsg(e)); } finally { setBusy(null); }
  };
  const exportList = async (status) => {
    try {
      const r = await gymService.exportMembers(vid, { status });
      downloadBlob(r.data, `gym-members-${status}.csv`);
    } catch { showError("Could not download the list"); }
  };

  if (!d) {
    return (
      <GymPage title="Gym Overview">
        <GymSkeleton />
      </GymPage>
    );
  }

  const refreshBtn = (
    <button
      type="button"
      onClick={() => refetch()}
      aria-label="Refresh overview"
      className="tap-scale w-10 h-10 rounded-xl bg-white border border-navy-100/70 shadow-card flex items-center justify-center text-navy-600 hover:bg-navy-50"
    >
      <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
    </button>
  );

  const c = d.counts;
  const series = d.revenue_series || [];
  const chartTotal = series.reduce((sum, s) => sum + monthTotal(s), 0);
  const maxY = Math.max(100, ...series.map(monthTotal));

  return (
    <GymPage title="Gym Overview" subtitle="Members, renewals and collections at a glance" actions={refreshBtn}>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 md:space-y-5 pb-2">
        <Hero d={d} c={c} series={series} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatTile icon={Users} tone="emerald" label="Active members" value={c.active} sublabel={`${c.new_this_month} joined this month`} />
          <StatTile icon={Clock} tone="amber" label="Expiring in 7 days" value={c.expiring} />
          <StatTile icon={UserX} tone="red" label="Expired" value={c.expired} sublabel={`${c.frozen} frozen`} />
          <StatTile icon={Wallet} tone="violet" label="Pending dues" value={c.dues_total} format={(v) => inr(Math.round(v))} sublabel={`${c.dues_count} members`} />
        </div>

        <MemberHealth c={c} />

        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 md:gap-4">
          <Surface className="p-4 md:p-5 flex flex-col items-start gap-3 md:flex-row md:items-center md:gap-4">
            <ProgressRing percent={d.renewal_rate || 0} display={d.renewal_rate == null ? "-" : `${d.renewal_rate}%`} />
            <div className="min-w-0">
              <p className="font-display font-semibold text-[15px] text-navy-900">Renewal rate (30 days)</p>
              <p className="text-xs text-navy-400 mt-1 leading-snug">{d.renewals_due_30d} memberships ended in the last 30 days</p>
            </div>
          </Surface>

          <Link to="/dashboard/gym/leads" className="tap-scale block">
            <Surface className="p-4 md:p-5 h-full flex flex-col items-start gap-3 md:flex-row md:items-center md:gap-4 hover:border-primary-200 transition-colors">
              <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${TONES.sky.chip}`}>
                <UserPlus size={22} />
              </span>
              <div className="min-w-0 md:flex-1">
                <p className="font-display font-semibold text-[15px] text-navy-900">New enquiries</p>
                <p className="font-display font-bold text-2xl text-navy-900 tabular-nums leading-tight">{d.new_leads}</p>
              </div>
              <span className="mt-auto md:mt-0 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 shrink-0">
                View leads <ArrowRight size={14} />
              </span>
            </Surface>
          </Link>
        </motion.div>

        {d.pending_payments.length > 0 && (
          <motion.div variants={fadeUp}>
            <Surface className="p-4 md:p-5 !border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-white md:bg-none">
              <SectionTitle
                title={`Payments to confirm (${d.pending_payments.length})`}
                hint="Check these against your bank / UPI before confirming"
              />
              <div className="-mx-2 divide-y divide-navy-100/60">
                {d.pending_payments.map((p) => (
                  <div key={p.id} className="px-2 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <InitialsAvatar name={p.member?.name} />
                      <div className="min-w-0">
                        <Link to={`/dashboard/gym/members/${p.member?.id}`} className="font-medium text-[13.5px] text-navy-900 truncate block hover:text-primary-600">
                          {p.member?.name}
                        </Link>
                        <p className="text-xs text-navy-400 mt-0.5 flex flex-wrap items-center gap-x-1.5">
                          <span className="font-semibold text-navy-700 tabular-nums">{inr(p.amount)}</span>
                          <span>· {p.mode.toUpperCase()}</span>
                          {p.meta?.claimed_at && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <BadgeCheck size={12} /> member says paid
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:shrink-0">
                      {p.rzp_link_id && (
                        <Button variant="outline" className="!py-2 !px-3.5 text-[13px] flex-1 sm:flex-none" loading={busy === `c${p.id}`} disabled={!!busy}
                          onClick={() => run(`c${p.id}`, () => gymService.refreshPayment(vid, p.id), "Checked")}>Check</Button>
                      )}
                      {!p.rzp_link_id && (
                        <Button className="!py-2 !px-3.5 text-[13px] flex-1 sm:flex-none" loading={busy === `k${p.id}`} disabled={!!busy}
                          onClick={() => run(`k${p.id}`, () => gymService.confirmPayment(vid, p.id), "Payment confirmed")}>Confirm</Button>
                      )}
                      <Button variant="outline" className="!py-2 !px-3.5 text-[13px] flex-1 sm:flex-none" loading={busy === `x${p.id}`} disabled={!!busy}
                        onClick={() => run(`x${p.id}`, () => gymService.cancelPayment(vid, p.id), "Cancelled")}>Cancel</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Surface>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <ShiftOverviewCard />
        </motion.div>

        <motion.div variants={fadeUp}>
          <Surface className="p-4 md:p-5">
            <SectionTitle
              title="Collections"
              hint="Last 6 months"
              action={<p className="font-display font-bold text-lg text-navy-900 tabular-nums">{inr(chartTotal)}</p>}
            />
            {/* Mobile: this month's split in three small cards */}
            <div className="md:hidden mb-3">
              <p className="text-[11px] text-navy-400 mb-1.5">This month</p>
              <div className="grid grid-cols-3 gap-2">
                {SERIES.map((s) => (
                  <div key={s.key} className="min-w-0 rounded-2xl bg-navy-50/70 px-2.5 py-2">
                    <span className="flex items-center gap-1.5 text-[10.5px] text-navy-500 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <p className="mt-0.5 font-display font-semibold text-[13px] text-navy-900 truncate tabular-nums">
                      {inr(Number(series[series.length - 1]?.[s.key]) || 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {/* Desktop / tablet legend (unchanged) */}
            <div className="hidden md:flex flex-wrap gap-x-4 gap-y-1 mb-2">
              {SERIES.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5 text-[11.5px] text-navy-500">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
            <div className="relative h-48 md:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid vertical={false} stroke="#e3e5ec" strokeDasharray="3 5" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6d7591" }} dy={6} />
                  <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11, fill: "#6d7591" }} tickFormatter={compact} domain={[0, maxY]} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f3f4f8" }} />
                  <Bar dataKey="new" name="New joinings" stackId="a" fill="#10b981" animationDuration={900} />
                  <Bar dataKey="renewal" name="Renewals" stackId="a" fill="#2563eb" animationDuration={900} />
                  <Bar dataKey="other" name="Other" stackId="a" fill="#cbd0de" radius={[6, 6, 0, 0]} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
              {chartTotal === 0 && (
                <div className="absolute inset-x-0 top-6 flex justify-center pointer-events-none">
                  <span className="rounded-full bg-navy-50 px-3 py-1 text-[11.5px] text-navy-500">No collections recorded yet</span>
                </div>
              )}
            </div>
          </Surface>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <Surface className="p-4 md:p-5">
            <SectionTitle
              title="Expiring this week"
              action={d.expiring_list.length > 0 && (
                <Button variant="outline" className="!py-1.5 !px-3 text-xs" onClick={() => exportList("expiring")}>
                  <Download size={14} /> Download list
                </Button>
              )}
            />
            {d.expiring_list.length === 0 ? (
              <EmptyState title="No one is expiring this week" description="Memberships ending soon will show up here." />
            ) : (
              <div className="-mx-2 space-y-0.5">
                {d.expiring_list.map((m) => (
                  <PersonRow
                    key={m.id}
                    to={`/dashboard/gym/members/${m.id}`}
                    name={m.name}
                    sub={`${m.plan_name} · ${fmtDate(m.end_date)}`}
                    right={<StatusPill status={m.display_status} daysLeft={m.days_left} />}
                  />
                ))}
              </div>
            )}
          </Surface>

          <Surface className="p-4 md:p-5">
            <SectionTitle
              title="Pending dues"
              action={d.dues_list.length > 0 && (
                <Button variant="outline" className="!py-1.5 !px-3 text-xs" onClick={() => exportList("dues")}>
                  <Download size={14} /> Download list
                </Button>
              )}
            />
            {d.dues_list.length === 0 ? (
              <EmptyState title="No pending dues" description="Members with a balance to pay will show up here." />
            ) : (
              <div className="-mx-2 space-y-0.5">
                {d.dues_list.map((m) => (
                  <PersonRow
                    key={m.id}
                    to={`/dashboard/gym/members/${m.id}`}
                    name={m.name}
                    sub={m.plan_name}
                    right={<span className="text-sm font-semibold text-red-600 tabular-nums">{inr(m.balance_due)}</span>}
                  />
                ))}
              </div>
            )}
          </Surface>
        </motion.div>
      </motion.div>
    </GymPage>
  );
}