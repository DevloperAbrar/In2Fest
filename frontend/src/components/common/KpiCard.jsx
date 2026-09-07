import React from "react";

export default function KpiCard({ icon: Icon, label, value, sublabel, accent = "#e8192c" }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-4 flex items-start gap-3 min-w-0">
      {Icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accent}14` }}
        >
          <Icon size={19} style={{ color: accent }} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11.5px] text-navy-400 font-medium truncate">{label}</p>
        <p className="text-lg md:text-xl font-display font-bold text-navy-900 mt-0.5 truncate">{value}</p>
        {sublabel && <p className="text-[11px] text-navy-400 mt-0.5 truncate">{sublabel}</p>}
      </div>
    </div>
  );
}