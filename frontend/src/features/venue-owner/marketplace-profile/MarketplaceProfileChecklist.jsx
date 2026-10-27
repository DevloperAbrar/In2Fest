import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ProgressRing, Surface } from "../dashboard/dashboardUi.jsx";

export default function MarketplaceProfileChecklist({ percentage = 0 }) {
  if (percentage >= 100) return null;

  return (
    <Link to="/dashboard/marketplace-profile" className="tap-scale block h-full">
      <Surface className="h-full p-4 flex items-center gap-3.5 hover:border-primary-200 transition-colors">
        <ProgressRing percent={percentage} />
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-[14.5px] text-navy-900">Get discovered</p>
          <p className="text-xs text-navy-400 mt-0.5 leading-snug">
            Complete your Marketplace Profile to start receiving inquiries.
          </p>
        </div>
        <ChevronRight size={18} className="text-navy-300 shrink-0" />
      </Surface>
    </Link>
  );
}