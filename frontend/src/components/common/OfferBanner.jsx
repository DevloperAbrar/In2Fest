import React from "react";
import { getDaysLeft } from "../../lib/planPricing";

export default function OfferBanner({ offer, className = "" }) {
  if (!offer?.active) return null;
  const days = getDaysLeft(offer.ends_at);

  return (
    <div
      className={`rounded-2xl px-5 py-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${className}`}
      style={{ background: "linear-gradient(135deg,#C1352B 0%,#E8A33D 100%)" }}
    >
      <div>
        <p className="text-[11px] uppercase tracking-widest opacity-90">Limited-time offer</p>
        <p className="text-lg font-bold leading-tight">
          {offer.name || "Special Offer"} — {offer.percent}% OFF on all paid plans
        </p>
      </div>
      {days !== null && (
        <span className="self-start sm:self-auto text-xs font-semibold bg-white/20 rounded-full px-3 py-1.5 whitespace-nowrap">
          {days === 0 ? "Ends today" : `Ends in ${days} day${days === 1 ? "" : "s"}`}
        </span>
      )}
    </div>
  );
}