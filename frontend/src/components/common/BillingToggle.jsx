import React from "react";

export default function BillingToggle({
  value,
  onChange,
  savePercent = 0,
  activeClass = "bg-navy-900 text-white"
}) {
  const base = "px-5 py-2 text-sm font-semibold rounded-full transition-all flex items-center";
  const inactive = "text-gray-500 hover:text-gray-800";

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-gray-200 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`${base} ${value === "monthly" ? activeClass : inactive}`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={`${base} ${value === "yearly" ? activeClass : inactive}`}
      >
        Yearly
        {savePercent > 0 && (
          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            SAVE {savePercent}%
          </span>
        )}
      </button>
    </div>
  );
}