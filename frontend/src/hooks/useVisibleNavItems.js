import { useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { VenueContext } from "../context/VenueContext.jsx";

const OWNER_ONLY_PATHS = ["/dashboard/settings", "/dashboard/analytics"];

export function useVisibleNavItems(items = []) {
  const { user } = useAuth();
  const venueCtx = useContext(VenueContext); // null outside VenueProvider (e.g. admin panel)
  const isTeamMember = user?.role === "team_member";

  // Only filter by plan once the venue has really loaded. In the admin panel
  // (no VenueProvider) or while loading, show everything so nothing flashes away.
  const venueReady = !!venueCtx && !venueCtx.loading && !!venueCtx.venue;
  const planFeatures = venueCtx?.venue?.subscription?.plan?.features || [];

  return items.filter((item) => {
    if (isTeamMember && OWNER_ONLY_PATHS.includes(item.path)) return false;
    if (isTeamMember && item.requiredFeature) {
      return user.permissions?.[item.requiredFeature] === true;
    }
    if (!item.requiredFeature) return true;
    if (!venueReady) return true;
    return planFeatures.includes(item.requiredFeature);
  });
}