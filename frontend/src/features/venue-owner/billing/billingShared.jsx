import React from "react";
import { STATUS_META } from "../../../lib/billingMath";

export const inputCls =
  "w-full h-10 px-3 rounded-lg border border-navy-200 bg-white text-sm text-navy-800 placeholder:text-navy-300 " +
  "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 disabled:bg-navy-50 disabled:text-navy-300";

export const labelCls = "block text-xs font-medium text-navy-500 mb-1";

export function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset whitespace-nowrap ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`bg-white rounded-2xl border border-navy-100/70 shadow-card ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-navy-900 text-sm">{title}</h3>
            {subtitle && <p className="text-xs text-navy-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={title || action ? "px-5 pb-5" : "p-5"}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, error, className = "", children }) {
  return (
    <div className={className}>
      {label && <label className={labelCls}>{label}</label>}
      {children}
      {hint && !error && <p className="text-[11px] text-navy-400 mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, disabled = false, label, hint }) {
  return (
    <div className={`flex items-start justify-between gap-3 py-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-navy-800">{label}</p>
        {hint && <p className="text-xs text-navy-400 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${checked ? "bg-primary-600" : "bg-navy-200"} disabled:cursor-not-allowed`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );
}