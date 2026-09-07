import React from "react";

// Custom SVG icons  - sharper and more distinctive than lucide defaults
function IconVerifiedBusiness() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21L12 17.77L6.82 21L8 14.14L3 9.27L9.91 8.26L12 2Z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M9 12.5L11 14.5L15.5 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21L12 17.77L6.82 21L8 14.14L3 9.27L9.91 8.26L12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDocumentsVerified() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="2" width="13" height="17" rx="2" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7h6M8 10h6M8 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="18" cy="17" r="4" fill="currentColor" />
      <path d="M16.2 17l1.2 1.2 2-2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPremiumPartner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 7L7 17H17L21 7L16 11L12 4L8 11L3 7Z"
        fill="currentColor"
        opacity="0.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M7 20h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const BADGE_CONFIG = {
  verified_business: {
    Icon: IconVerifiedBusiness,
    label: "Verified Business",
    // Card chip
    chipCls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    chipDot: "bg-emerald-500",
    // Full pill (profile hero)
    pillCls: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 border border-emerald-200 shadow-sm",
  },
  documents_verified: {
    Icon: IconDocumentsVerified,
    label: "Documents Verified",
    chipCls: "bg-blue-50 text-blue-700 border border-blue-200",
    chipDot: "bg-blue-500",
    pillCls: "bg-gradient-to-r from-blue-50 to-sky-50 text-blue-800 border border-blue-200 shadow-sm",
  },
  premium_partner: {
    Icon: IconPremiumPartner,
    label: "Premium Partner",
    chipCls: "bg-amber-50 text-amber-700 border border-amber-200",
    chipDot: "bg-amber-500",
    pillCls: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 border border-amber-300 shadow-sm",
  },
};

/**
 * variant="chip"  → icon-only circle with dot indicator  - used on dense search cards
 * variant="pill"  → icon + label pill  - used on vendor public profile hero (default)
 */
export default function Badge({ type, variant = "pill" }) {
  const cfg = BADGE_CONFIG[type];
  if (!cfg) return null;
  const { Icon } = cfg;

  if (variant === "chip") {
    return (
      <span
        title={cfg.label}
        className={`relative inline-flex items-center justify-center w-6 h-6 rounded-full ${cfg.chipCls} cursor-default`}
      >
        <Icon />
        {/* small presence dot */}
        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${cfg.chipDot} border border-white`} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${cfg.pillCls}`}
    >
      <Icon />
      {cfg.label}
    </span>
  );
}