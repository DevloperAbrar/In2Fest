import React from "react";
import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-primary-600 hover:bg-primary-700 active:bg-primary-700 text-white shadow-sm shadow-primary-600/20",
  secondary: "bg-navy-50 hover:bg-navy-100 text-navy-800",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  outline: "border border-navy-200 hover:bg-navy-50 text-navy-700"
};

export default function Button({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`tap-scale inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}