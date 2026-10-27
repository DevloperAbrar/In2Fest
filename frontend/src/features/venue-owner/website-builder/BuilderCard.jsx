import React from "react";

// Shared building blocks for the Website Builder tabs so every block looks and behaves the same.

export function Switch({ checked, disabled = false, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
        checked ? "bg-primary-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// Floating bar that appears only when there is something to save.
export function SaveBar({ dirty, saving, onSave, text = "You have unsaved changes", buttonLabel = "Save" }) {
  if (!dirty) return null;
  return (
    <div className="sticky bottom-4 z-10 mt-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-navy-900 py-2.5 pl-4 pr-2.5 shadow-lg">
        <p className="text-[13px] font-medium text-white">{text}</p>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-navy-900 transition-opacity active:scale-95 disabled:opacity-60"
        >
          {saving ? "Saving..." : buttonLabel}
        </button>
      </div>
    </div>
  );
}

export default function BuilderCard({ title, description, action, children, className = "" }) {
  const hasHeader = title || description || action;
  return (
    <section className={`rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] leading-snug text-gray-500">{description}</p>}
          </div>
          {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}