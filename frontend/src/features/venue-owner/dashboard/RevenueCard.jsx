import React, { useEffect, useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../../../lib/formatters";
import { Surface } from "./dashboardUi.jsx";

// True on phones (below Tailwind's md breakpoint). Used only to show point markers on the chart.
function useIsMobile() {
  const query = "(max-width: 767px)";
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-navy-900 text-white px-3 py-2 shadow-card">
      <p className="text-[11px] text-white/60">{label}</p>
      <p className="font-display font-semibold text-sm tabular-nums">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export default function RevenueCard({ trend = [], className = "" }) {
  const gradId = useId().replace(/:/g, "");
  const isMobile = useIsMobile();
  const data = (trend || []).map((t) => ({
    label: String(t.month || "").split(" ")[0],
    full: t.month,
    revenue: Number(t.revenue) || 0
  }));
  const total = data.reduce((sum, d) => sum + d.revenue, 0);
  const average = data.length ? total / data.length : 0;
  const best = total > 0 ? data.reduce((a, b) => (b.revenue > a.revenue ? b : a), data[0]) : null;

  return (
    <Surface className={`p-4 md:p-5 ${className}`}>
      {/* Mobile header with quick numbers */}
      <div className="md:hidden mb-3">
        <div>
          <h2 className="font-display font-semibold text-[15px] text-navy-900">Revenue</h2>
          <p className="text-xs text-navy-400 mt-0.5">Last 6 months</p>
        </div>
        <p className="mt-3 font-display font-bold text-[28px] leading-none text-navy-900 tabular-nums">
          {formatCurrency(total)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-2xl bg-navy-50/80 px-3 py-2">
            <p className="text-[10.5px] text-navy-400">Monthly average</p>
            <p className="mt-0.5 font-display font-semibold text-[14px] text-navy-900 truncate tabular-nums">
              {formatCurrency(Math.round(average))}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl bg-primary-50/70 px-3 py-2">
            <p className="text-[10.5px] text-navy-400">Best month</p>
            <p className="mt-0.5 font-display font-semibold text-[14px] text-navy-900 truncate tabular-nums">
              {best ? `${best.label} · ${formatCurrency(best.revenue)}` : "–"}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop / tablet header (unchanged) */}
      <div className="hidden md:flex items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="font-display font-semibold text-[15px] text-navy-900">Revenue</h2>
          <p className="text-xs text-navy-400 mt-0.5">Last 6 months</p>
        </div>
        <p className="font-display font-bold text-lg text-navy-900 tabular-nums">{formatCurrency(total)}</p>
      </div>

      <div className="relative h-44 md:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e8192c" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#e8192c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e3e5ec" strokeDasharray="3 5" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#6d7591" }}
              dy={6}
            />
            <YAxis hide domain={[0, (max) => Math.max(max, 100)]} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#c3c7d6", strokeDasharray: "3 4" }} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#e8192c"
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              dot={isMobile && total > 0 ? { r: 3, strokeWidth: 2, stroke: "#e8192c", fill: "#fff" } : false}
              activeDot={{ r: 5, strokeWidth: 3, stroke: "#fff", fill: "#e8192c" }}
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>

        {total === 0 && (
          <div className="absolute inset-x-0 top-6 flex justify-center pointer-events-none">
            <span className="rounded-full bg-navy-50 px-3 py-1 text-[11.5px] text-navy-500">
              No revenue recorded yet
            </span>
          </div>
        )}
      </div>
    </Surface>
  );
}