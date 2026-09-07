import React from "react";
import Card from "./Card";

export default function FunnelBars({ title, stages = [], accent = "#7c3aed" }) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card title={title}>
      <div className="space-y-3">
        {stages.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="capitalize">{s.label.replace(/_/g, " ")}</span>
              <span className="font-semibold text-gray-900">{s.count}</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(s.count / max) * 100}%`, backgroundColor: accent }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}