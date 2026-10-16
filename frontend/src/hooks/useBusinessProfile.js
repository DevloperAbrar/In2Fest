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

// Returns the business profile (labels, modules, sidebar entries, billing config) for the current
// venue, or for an explicit category slug (+ optional secondary slugs). Safe outside VenueProvider.
export function useBusinessProfile(categorySlug, secondarySlugs) {
  const venueCtx = useContext(VenueContext);
  const slug = categorySlug || venueCtx?.venue?.business_category || null;
  const rawSecondary = Array.isArray(secondarySlugs)
    ? secondarySlugs
    : !categorySlug
      ? venueCtx?.venue?.secondary_categories
      : null;
  const secondaryKey = (rawSecondary || []).filter(Boolean).slice(0, 2).join(",");
  const cacheKey = slug ? `${slug}|${secondaryKey}` : null;

  const [loaded, setLoaded] = useState({ key: null, data: null });
  const [failedKey, setFailedKey] = useState(null);

  const profile = !cacheKey ? null : cache.get(cacheKey) || (loaded.key === cacheKey ? loaded.data : null);
  const failed = failedKey === cacheKey;

  useEffect(() => {
    if (!cacheKey || cache.has(cacheKey)) return undefined;
    const [s, sec] = cacheKey.split("|");
    let cancelled = false;
    businessProfileService
      .getForCategory(s, sec ? sec.split(",") : [])
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          cache.set(cacheKey, data);
          if (!cancelled) setLoaded({ key: cacheKey, data });
        } else if (!cancelled) {
          setFailedKey(cacheKey);
        }
      })
      .catch(() => {
        if (!cancelled) setFailedKey(cacheKey);
      });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  return {
    profile,
    terms: profile?.terms || FALLBACK_TERMS,
    loading: Boolean(cacheKey) && !profile && !failed
  };
}