import React from "react";
import { TONES } from "./gymUi.jsx";

/* Small UI pieces used by the Members list, Add member sheet and Member profile.
   Presentation only. No data or API logic lives here. */

const AVATAR_TONES = ["red", "sky", "emerald", "amber", "violet", "navy"];

// Ring colour around a member's photo, so the status is visible at a glance.
export const STATUS_RING = {
  active: "ring-emerald-400",
  expiring: "ring-amber-400",
  expired: "ring-primary-400",
  frozen: "ring-sky-400",
  new: "ring-navy-200"
};

export function MemberAvatar({ name = "?", src, size = 48, status, className = "" }) {
  const clean = String(name || "?").trim() || "?";
  const initials = clean
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const idx = [...clean].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length;
  const ring = status ? `ring-2 ring-offset-2 ring-offset-white ${STATUS_RING[status] || STATUS_RING.new}` : "";
  const style = { width: size, height: size };
  if (src) {
    return <img src={src} alt="" style={style} className={`rounded-full object-cover shrink-0 ${ring} ${className}`} />;
  }
  return (
    <div
      style={{ ...style, fontSize: Math.round(size * 0.34) }}
      className={`rounded-full flex items-center justify-center font-display font-semibold shrink-0 ${TONES[AVATAR_TONES[idx]].chip} ${ring} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

// Friendly drawing for "no members" (hand-built SVG, no image file needed).
export function EmptyMembersArt({ className = "" }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" className={className} aria-hidden="true">
      <ellipse cx="80" cy="108" rx="52" ry="7" className="fill-navy-100/70" />
      <rect x="30" y="22" width="100" height="72" rx="16" className="fill-white stroke-navy-200" strokeWidth="2" />
      <circle cx="56" cy="48" r="11" className="fill-primary-100" />
      <circle cx="56" cy="45" r="4" className="fill-primary-500" />
      <path d="M48 56c1.5-4 4.5-6 8-6s6.5 2 8 6" className="stroke-primary-500" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="76" y="40" width="40" height="6" rx="3" className="fill-navy-200" />
      <rect x="76" y="52" width="26" height="5" rx="2.5" className="fill-navy-100" />
      <rect x="44" y="70" width="72" height="6" rx="3" className="fill-navy-100" />
      <circle cx="124" cy="30" r="14" className="fill-primary-500" />
      <path d="M124 24v12M118 30h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Drawing for the CSV import upload area.
export function UploadArt({ className = "" }) {
  return (
    <svg viewBox="0 0 120 96" fill="none" className={className} aria-hidden="true">
      <ellipse cx="60" cy="88" rx="38" ry="5" className="fill-navy-100/70" />
      <path d="M34 14h38l16 16v50a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6Z" className="fill-white stroke-navy-200" strokeWidth="2" />
      <path d="M72 14v12a4 4 0 0 0 4 4h12" className="stroke-navy-200" strokeWidth="2" />
      <rect x="38" y="44" width="40" height="5" rx="2.5" className="fill-navy-100" />
      <rect x="38" y="54" width="30" height="5" rx="2.5" className="fill-navy-100" />
      <rect x="38" y="64" width="36" height="5" rx="2.5" className="fill-navy-100" />
      <circle cx="88" cy="68" r="16" className="fill-primary-500" />
      <path d="M88 76V60M81 66l7-7 7 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Section of the Add member sheet.
   Mobile: a soft card with an icon + title. Desktop: renders exactly like a plain block (title hidden). */
export function SheetSection({ icon: Icon, title, hint, tone = "navy", divider = false, className = "", children }) {
  const desktop = divider
    ? "md:rounded-none md:bg-transparent md:p-0 md:pt-2 md:border-x-0 md:border-b-0 md:border-t md:border-gray-200"
    : "md:rounded-none md:bg-transparent md:border-0 md:p-0";
  return (
    <section className={`rounded-2xl bg-navy-50/50 border border-navy-100/70 p-4 space-y-3 ${desktop} ${className}`}>
      <div className="md:hidden flex items-center gap-2.5">
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone].chip}`}>
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <div className="min-w-0">
          <p className="font-display font-semibold text-[14px] text-navy-900 leading-tight">{title}</p>
          {hint && <p className="text-[11.5px] text-navy-400 leading-tight mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/* Round icon button with a tiny label under it. Used for the 4-column action grid on the member profile. */
export function ActionTile({ icon: Icon, label, tone = "navy", onClick, href, disabled, badge }) {
  const inner = (
    <>
      <span
        className={`relative w-[52px] h-[52px] rounded-[18px] flex items-center justify-center ring-1 ring-inset ring-black/5 shadow-sm ${TONES[tone].chip}`}
      >
        <Icon size={22} strokeWidth={2} />
        {badge && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary-500 ring-2 ring-white" />}
      </span>
      <span className="text-[11.5px] font-medium text-navy-700 text-center leading-tight line-clamp-2">{label}</span>
    </>
  );
  const cls = `tap-scale flex flex-col items-center gap-1.5 rounded-xl py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
    disabled ? "opacity-40 pointer-events-none" : ""
  }`;
  if (href && !disabled) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}

/* One labelled line with an icon, used in the profile details card. */
export function InfoRow({ icon: Icon, label, tone = "navy", children }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone].chip}`}>
        <Icon size={16} strokeWidth={2.1} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-navy-400 leading-tight">{label}</p>
        <p className="text-[13.5px] text-navy-900 mt-0.5 leading-snug break-words">{children}</p>
      </div>
    </div>
  );
}