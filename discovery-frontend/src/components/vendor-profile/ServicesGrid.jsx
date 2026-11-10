import React from "react";
import { Check } from "lucide-react";

export default function ServicesGrid({ services = [] }) {
  if (!services.length) return null;

  return (
    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-2.5">
      {services.map((s) => (
        <div
          key={s}
          className="group flex items-center gap-2.5 text-sm font-medium text-gray-700 bg-gray-50 border border-transparent rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-white hover:border-navy-100 hover:shadow-md hover:-translate-y-0.5"
        >
          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
            <Check size={13} strokeWidth={3} />
          </span>
          <span className="min-w-0 break-words">{s}</span>
        </div>
      ))}
    </div>
  );
}