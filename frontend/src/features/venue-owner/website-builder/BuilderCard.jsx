import React from "react";

// Shared building blocks for the Website Builder page so every block looks and behaves the same.

export function Switch({ checked, disabled = false, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
        checked ? "bg-primary-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function BuilderCard({ step, title, description, action, children, className = "" }) {
  return (
    <section className={`bg-white border border-gray-200 rounded-2xl ${className}`}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-4 sm:p-5 border-b border-gray-100">
        <div className="flex items-start gap-3 min-w-0">
          {step && (
            <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">
              {step}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
          </div>
        </div>
        {action && <div className="flex flex-shrink-0 items-center gap-3">{action}</div>}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}