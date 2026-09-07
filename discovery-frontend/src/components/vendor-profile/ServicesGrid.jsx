import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function ServicesGrid({ services = [] }) {
  if (!services.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {services.map((s) => (
        <div key={s} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5">
          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
          {s}
        </div>
      ))}
    </div>
  );
}