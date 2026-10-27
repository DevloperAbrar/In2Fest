import React, { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../../../lib/formatters";
import { Surface } from "./dashboardUi.jsx";

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
  const data = (trend || []).map((t) => ({
    label: String(t.month || "").split(" ")[0],
    full: t.month,
    revenue: Number(t.revenue) || 0
  }));
  const total = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <Surface className={`p-4 md:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="font-display font-semibold text-[15px] text-navy-900">Revenue</h2>
          <p className="text-xs text-navy-400 mt-0.5">Last 6 months</p>
        </div>
        <p className="font-display font-bold text-lg text-navy-900 tabular-nums">{formatCurrency(total)}</p>
      </div>

      <div className="relative h-52">
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
              dot={false}
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