import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import Card from "./Card";

const DEFAULT_COLORS = ["#7c3aed", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899", "#6b7280", "#14b8a6"];

export default function DonutBreakdown({ title, data = [], colors = DEFAULT_COLORS, action }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <Card title={title} action={action}>
      {total === 0 ? (
        <p className="text-sm text-gray-400 text-center py-14">No data yet</p>
      ) : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={180}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2 min-w-0">
            {data.map((d, i) => (
              <div key={d.label} className="flex items-center justify-between text-sm gap-2">
                <span className="flex items-center gap-2 text-gray-600 truncate capitalize">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="truncate">{String(d.label).replace(/_/g, " ")}</span>
                </span>
                <span className="font-semibold text-gray-900 flex-shrink-0">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}