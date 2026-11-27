import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useVenue } from "../../context/VenueContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { hasVenueFeature } from "../../lib/venueFeatures";

// Use it INSIDE <RequireFeature feature="gym">, so the subscription lock and team permission stay handled there.
// planOnly = the feature comes only with a plan (no add-on to buy), so the message asks for a plan upgrade.
export default function RequireAddon({ feature, label, planOnly = false, children }) {
  const { venue, loading } = useVenue();
  const { user } = useAuth();
  if (loading) return null;
  if (hasVenueFeature(venue, feature)) return children;

  const isTeamMember = user?.role === "team_member";
  const body = isTeamMember
    ? `Please ask the business owner to activate ${label}.`
    : planOnly
      ? `${label} is not included in your current plan. Upgrade your plan to use it. Your data is safe.`
      : `${label} is an add-on. Activate it from Settings > Subscription to start using it. Your data is safe.`;
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <Lock size={40} className="text-gray-300 mb-4" />
      <h2 className="text-lg font-semibold text-gray-800 mb-2">{label} is not active for your account</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">{body}</p>
      {!isTeamMember && (
        <Link to="/dashboard/settings/subscription" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          {planOnly ? "View plans" : "View add-ons"}
        </Link>
      )}
    </div>
  );
}