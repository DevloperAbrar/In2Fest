import React from "react";
import { Link } from "react-router-dom";
import { useVenue } from "../../context/VenueContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { PLAN_FEATURES } from "../../lib/planFeatures";
import { Lock } from "lucide-react";

const LIVE_STATUSES = ["trial", "active", "expiring_soon"];

// Why the whole subscription is locked, or null when it is fine.
function getSubscriptionLock(sub) {
  if (!sub) return null;
  if (sub.status === "suspended") return "suspended";
  const trialOver =
    sub.status === "trial" && sub.current_period_end && new Date(sub.current_period_end) < new Date();
  if (trialOver) return "trial_ended";
  if (!LIVE_STATUSES.includes(sub.status)) return "expired";
  return null;
}

const LOCK_COPY = {
  trial_ended: {
    title: "Your free trial has ended",
    body: "Pay to activate your plan and get back to your dashboard. Your data is safe."
  },
  expired: {
    title: "Your plan has expired",
    body: "Renew your plan to keep using your tools. Your data is safe."
  },
  suspended: {
    title: "Your account is suspended",
    body: "Please contact In2Fest support to get it activated again."
  }
};

export default function RequireFeature({ feature, children }) {
  const { venue, loading } = useVenue();
  const { user } = useAuth();

  if (loading) return null;

  const isTeamMember = user?.role === "team_member";

  // Subscription ended (trial over, expired, suspended): lock the page, point to payment.
  const lock = getSubscriptionLock(venue?.subscription);
  if (lock) {
    const copy = LOCK_COPY[lock];
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <Lock size={40} className="text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-800 mb-2">{copy.title}</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          {isTeamMember ? "Please ask the business owner to renew the plan." : copy.body}
        </p>
        {!isTeamMember && lock !== "suspended" && (
          <Link
            to="/dashboard/settings/subscription"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            {lock === "trial_ended" ? "Pay & activate" : "Renew now"}
          </Link>
        )}
      </div>
    );
  }

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
  if (isTeamMember && user.permissions?.[feature] !== true) {
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