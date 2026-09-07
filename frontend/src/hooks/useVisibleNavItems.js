import { useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { VenueContext } from "../context/VenueContext.jsx";

const OWNER_ONLY_PATHS = ["/dashboard/settings", "/dashboard/analytics"];

export function useVisibleNavItems(items = []) {
  const { user } = useAuth();
  const venueCtx = useContext(VenueContext); // null outside VenueProvider (e.g. admin panel)
  const planFeatures = venueCtx?.venue?.subscription?.plan?.features;
  const isTeamMember = user?.role === "team_member";

  return items.filter((item) => {
    if (isTeamMember && OWNER_ONLY_PATHS.includes(item.path)) return false;
    if (isTeamMember && item.requiredFeature) {
      return user.permissions?.[item.requiredFeature] === true;
    }
    if (!item.requiredFeature) return true;
    if (!planFeatures) return true;
    return planFeatures.includes(item.requiredFeature);
  });
}