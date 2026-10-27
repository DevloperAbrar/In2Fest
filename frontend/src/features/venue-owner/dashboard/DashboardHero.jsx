import React from "react";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "../../../lib/formatters";
import { AnimatedNumber, Sparkline } from "./dashboardUi.jsx";
import { fadeUp } from "./dashboardTheme.js";

function greeting() {
  const h = dayjs().hour();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const FORMATS = {
  currency: (v) => formatCurrency(Math.round(v)),
  percent: (v) => `${Math.round(v)}%`,
  number: undefined
};

// Used only when the backend is still on the old /analytics response.
function legacyStats(a) {
  return [
    { key: "bookings", label: "Bookings", value: Number(a?.monthlyBookings) || 0, kind: "number" },
    { key: "conversion", label: "Inquiry conversion", value: Number(a?.conversionRate) || 0, kind: "percent" },
    { key: "pending", label: "Pending payments", value: Number(a?.totalPendingPayments) || 0, kind: "currency" }
  ];
}

function MiniStat({ label, children }) {
  return (
    <div className="flex-1 min-w-0 px-3 first:pl-0 last:pr-0">
      <p className="text-[11px] text-white/55 truncate">{label}</p>
      <p className="mt-0.5 font-display font-semibold text-[15px] md:text-base text-white truncate tabular-nums">
        {children}
      </p>
    </div>
  );
}

export default function DashboardHero({ userName, venueName, analytics, refreshing, onRefresh }) {
  const firstName = (userName || "").trim().split(/\s+/)[0] || "there";
  const trend = (analytics?.revenueTrend || []).map((t) => Number(t.revenue) || 0);
  const current = Number(analytics?.monthlyRevenue) || 0;
  const labels = analytics?.labels || {};
  const stats = analytics?.heroStats?.length ? analytics.heroStats : legacyStats(analytics);

  const prev = trend.length >= 2 ? trend[trend.length - 2] : 0;
  const delta = prev > 0 ? Math.round(((current - prev) / prev) * 100) : null;
  const up = delta !== null && delta >= 0;

  return (
    <motion.section
      variants={fadeUp}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-700 via-navy-800 to-navy-900 text-white p-5 md:p-7 shadow-card"
    >
      <svg
        className="absolute -right-10 -top-16 w-72 h-72 text-white pointer-events-none"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        {[30, 52, 74, 96].map((r, i) => (
          <circle key={r} cx="100" cy="100" r={r} stroke="currentColor" strokeOpacity={0.09 - i * 0.015} strokeWidth="1" />
        ))}
      </svg>
      <div className="absolute -left-16 -bottom-20 w-56 h-56 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] text-white/60">{dayjs().format("dddd, D MMM")}</p>
            <h2 className="font-display font-semibold text-[19px] md:text-xl text-white mt-0.5 truncate">
              {greeting()}, {firstName}
            </h2>
            {venueName && <p className="text-[12.5px] text-white/55 mt-0.5 truncate">{venueName}</p>}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh dashboard"
            className="tap-scale w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center shrink-0"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] text-white/60">{labels.revenue || "This month's revenue"}</p>
            <p className="font-display font-bold text-[34px] md:text-[40px] leading-none mt-1.5 tabular-nums truncate">
              <AnimatedNumber value={current} format={(v) => formatCurrency(Math.round(v))} />
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-medium">
              {delta !== null ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                    up ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"
                  }`}
                >
                  {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {up ? "+" : ""}
                  {delta}% vs last month
                </span>
              ) : (
                <span className="text-white/50">{labels.empty || "Your first booking will show up here"}</span>
              )}
            </div>
          </div>

          <Sparkline values={trend} className="w-28 md:w-44 h-14 md:h-16 shrink-0" />
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex divide-x divide-white/10">
          {stats.slice(0, 3).map((s) => (
            <MiniStat key={s.key || s.label} label={s.label}>
              {s.value === null || s.value === undefined ? (
                "–"
              ) : (
                <AnimatedNumber value={Number(s.value) || 0} format={FORMATS[s.kind]} />
              )}
            </MiniStat>
          ))}
        </div>
      </div>
    </motion.section>
  );
}