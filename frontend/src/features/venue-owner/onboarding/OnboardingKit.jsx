import React from "react";
import { Check } from "lucide-react";
import logo from "../../../assets/logo.png";

const STEPS = ["Plan", "Business type", "Details"];

/* Logo + 3-step progress. step = 1 (plan), 2 (business type), 3 (details). */
export function OnboardingHeader({ step }) {
  return (
    <div className="text-center">
      <img src={logo} alt="In2Fest" className="h-9 w-auto mx-auto" />
      <ol className="flex items-center justify-center gap-2 sm:gap-3 mt-6" aria-label="Setup progress">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const on = step === n;
          return (
            <li key={label} className="flex items-center gap-2 sm:gap-3" aria-current={on ? "step" : undefined}>
              <span className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    done
                      ? "bg-emerald-500 text-white"
                      : on
                      ? "bg-primary-600 text-white"
                      : "bg-white border border-gray-200 text-gray-400"
                  }`}
                >
                  {done ? <Check size={13} strokeWidth={3} /> : n}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    on ? "text-navy-900" : "text-gray-400 hidden sm:inline"
                  }`}
                >
                  {label}
                </span>
              </span>
              {i < STEPS.length - 1 && <span className="w-6 sm:w-10 h-px bg-gray-200" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */
const inputBase =
  "w-full rounded-xl border bg-white px-3.5 py-3 text-[15px] text-navy-900 placeholder:text-gray-400 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-400";

const inputTone = (invalid) =>
  invalid
    ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
    : "border-gray-200 hover:border-gray-300 focus:border-navy-700 focus:ring-navy-700/10";

export function Field({ label, hint, error, optional, children }) {
  return (
    <div className="w-full">
      <label className="flex items-center justify-between text-sm font-semibold text-navy-900 mb-1.5">
        <span>{label}</span>
        {optional && <span className="text-[11px] font-medium text-gray-400">Optional</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ invalid, className = "", ...props }) {
  return <input className={`${inputBase} ${inputTone(invalid)} ${className}`} {...props} />;
}

export function SelectInput({ invalid, options = [], className = "", ...props }) {
  return (
    <select className={`${inputBase} ${inputTone(invalid)} ${className}`} {...props}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}