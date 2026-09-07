import React from "react";
import { LIVE_CITIES } from "../../data/launchCities";

export default function CityLaunchBadge() {
  if (LIVE_CITIES.length === 0) return null;
  const names = LIVE_CITIES.map((c) => c.name).join(", ");

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] md:text-xs font-medium text-white/80 bg-white/10 border border-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#4ade80" }} />
      Now live in {names}
    </span>
  );
}