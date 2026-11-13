import { useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { VenueContext } from "../context/VenueContext.jsx";
import { useBusinessProfile } from "./useBusinessProfile";
import { isRestrictedMember } from "../lib/teamScopes";

const OWNER_ONLY_PATHS = ["/dashboard/settings", "/dashboard/analytics", "/dashboard/staff"];

// Shown even while the business profile is still loading, so nothing flashes in and out.
const ALWAYS_NAV = ["dashboard", "settings"];

// Sidebar label for the gym tools on categories that are not "gym-fitness" (Sport academy etc.).
const GENERIC_TOOLS_LABEL = "Tools";

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
  const restricted = isRestrictedMember(user); // limited to specific tasks, no Reports

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

      // A team member given only specific tasks sees only those tools:
      // no dashboard, referrals or other general pages.
      if (restricted && !item.requiredFeature) return false;

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

      // Items meant only for specific categories (e.g. Gym tools for "gym-fitness"),
      // or for any category whose functionality (segment) matches (Super-Admin-created categories).
      if (item.categorySlugs && venueReady) {
        const bySlug = item.categorySlugs.some((s) => venueCategories.includes(s));
        const bySegment = Boolean(item.segmentKey) && profile?.segment?.key === item.segmentKey;
        if (!bySlug && !bySegment) return false;
      }

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
      // Gym tools on a non-gym category (Sport academy ...) are shown as "Tools".
      if (
        item.navKey === "gym" &&
        venueReady &&
        profile?.segment?.key === "gym" &&
        !venueCategories.includes("gym-fitness")
      ) {
        return { ...item, label: GENERIC_TOOLS_LABEL };
      }
      const termKey = LABEL_TERM[item.path];
      if (termKey && profile && terms[termKey]) return { ...item, label: terms[termKey] };
      return item;
    });
}