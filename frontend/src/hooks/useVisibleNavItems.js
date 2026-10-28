import { useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { VenueContext } from "../context/VenueContext.jsx";
import { useBusinessProfile } from "./useBusinessProfile";

const OWNER_ONLY_PATHS = ["/dashboard/settings", "/dashboard/analytics"];

// Shown even while the business profile is still loading, so nothing flashes in and out.
const ALWAYS_NAV = ["dashboard", "settings"];

// Sidebar labels follow the business type (Clients -> Students, Bookings -> Admissions, ...)
const LABEL_TERM = {
  "/dashboard/inquiries": "inquiries",
  "/dashboard/bookings": "bookings",
  "/dashboard/clients": "clients",
  "/dashboard/slots": "slots"
};

export function useVisibleNavItems(items = []) {
  const { user } = useAuth();
  const venueCtx = useContext(VenueContext); // null outside VenueProvider (e.g. admin panel)
  const { profile, terms, loading: profileLoading } = useBusinessProfile();
  const isTeamMember = user?.role === "team_member";

  // Only filter by plan once the venue has really loaded. In the admin panel
  // (no VenueProvider) or while loading, show everything so nothing flashes away.
  const venueReady = !!venueCtx && !venueCtx.loading && !!venueCtx.venue;
  const planFeatures = venueCtx?.venue?.subscription?.plan?.features || [];
  const modules = profile?.modules || null; // modules relevant to this business type
  const navAllow = profile?.nav || null; // sidebar entries for this vendor segment (null = no segment rules)
  const venueCategories = venueReady
    ? [venueCtx.venue.business_category, ...(venueCtx.venue.secondary_categories || [])].filter(Boolean)
    : [];

  return items
    .filter((item) => {
      if (user?.isDemo) return item.navKey === "gym"; // demo accounts: Gym tools only
      if (isTeamMember && OWNER_ONLY_PATHS.includes(item.path)) return false;

      // Vendor segment: a gym does not see Slots, a shop does not see Bookings, and so on.
      if (item.navKey && venueReady) {
        if (profileLoading) {
          if (!ALWAYS_NAV.includes(item.navKey)) return false;
        } else if (navAllow && !navAllow.includes(item.navKey)) {
          return false;
        }
      }

      // Items meant only for some business types (e.g. "Products & Catalog" for shops).
      if (item.businessTypes && venueReady && !(profile && item.businessTypes.includes(profile.key))) return false;

      // Items meant only for specific categories (e.g. Gym tools for "gym-fitness").
      if (item.categorySlugs && venueReady && !item.categorySlugs.some((s) => venueCategories.includes(s))) return false;

      // Hide modules that don't make sense for this business type (e.g. slots for a shop).
      if (item.requiredFeature && venueReady && modules && !modules.includes(item.requiredFeature)) return false;

      if (isTeamMember && item.requiredFeature) {
        return user.permissions?.[item.requiredFeature] === true;
      }
      if (!item.requiredFeature) return true;
      if (!venueReady) return true;
      return planFeatures.includes(item.requiredFeature);
    })
    .map((item) => {
      const termKey = LABEL_TERM[item.path];
      if (termKey && profile && terms[termKey]) return { ...item, label: terms[termKey] };
      return item;
    });
}