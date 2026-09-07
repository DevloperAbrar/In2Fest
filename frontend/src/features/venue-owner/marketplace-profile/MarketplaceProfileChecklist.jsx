import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function MarketplaceProfileChecklist({ percentage }) {
  if (percentage >= 100) return null;

  return (
    <div className="bg-white border border-primary-100 rounded-xl p-5 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
            <path
              className="text-gray-200"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-primary-600"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${percentage}, 100`}
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
            {percentage}%
          </span>
        </div>
        <div>
          <p className="font-semibold text-gray-800">Complete your Marketplace Profile</p>
          <p className="text-sm text-gray-500">Get listed on campussafar.com and start receiving discovery inquiries.</p>
        </div>
      </div>
      <Link
        to="/dashboard/marketplace-profile"
        className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline flex-shrink-0"
      >
        Complete now <ArrowRight size={14} />
      </Link>
    </div>
  );
}