import { useContext, useEffect, useState } from "react";
import { VenueContext } from "../context/VenueContext.jsx";
import { businessProfileService } from "../services/businessProfileService";

const cache = new Map();

export const FALLBACK_TERMS = {
  client: "Client", clients: "Clients",
  inquiry: "Inquiry", inquiries: "Inquiries",
  booking: "Booking", bookings: "Bookings",
  slot: "Slot", slots: "Slots",
  offering: "Service", offerings: "Services"
};

// Returns the business-type profile (labels, modules, billing config) for the current venue,
// or for an explicit category slug. Safe outside VenueProvider (returns fallbacks).
export function useBusinessProfile(categorySlug) {
  const venueCtx = useContext(VenueContext);
  const slug = categorySlug || venueCtx?.venue?.business_category || null;
  const [profile, setProfile] = useState(slug && cache.has(slug) ? cache.get(slug) : null);

  useEffect(() => {
    if (!slug) return undefined;
    if (cache.has(slug)) {
      setProfile(cache.get(slug));
      return undefined;
    }
    let cancelled = false;
    businessProfileService
      .getForCategory(slug)
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          cache.set(slug, data);
          if (!cancelled) setProfile(data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return {
    profile,
    terms: profile?.terms || FALLBACK_TERMS,
    loading: Boolean(slug) && !profile
  };
}