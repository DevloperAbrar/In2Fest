import React from "react";
import { Link } from "react-router-dom";
import { useVenue } from "../../context/VenueContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { PLAN_FEATURES } from "../../lib/planFeatures";
import { Lock } from "lucide-react";

export default function RequireFeature({ feature, children }) {
  const { venue, loading } = useVenue();
  const { user } = useAuth();

  if (loading) return null;

  const planFeatures = venue?.subscription?.plan?.features || [];
  const label = PLAN_FEATURES.find((f) => f.key === feature)?.label || feature;

  if (!planFeatures.includes(feature)) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <Lock size={40} className="text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-800 mb-2">{label} isn't included in your plan</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          Upgrade your subscription to unlock {label.toLowerCase()} and other premium features.
        </p>
        <Link to="/dashboard/settings/subscription" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          View Plans
        </Link>
      </div>
    );
  }

  // Plan allows it, but a scoped team member may still be locked out of it.
  if (user?.role === "team_member" && user.permissions?.[feature] !== true) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <Lock size={40} className="text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-800 mb-2">You don't have access to {label}</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          Ask the venue owner to enable {label.toLowerCase()} for your account under Settings → Team Members.
        </p>
      </div>
    );
  }

  return children;
}