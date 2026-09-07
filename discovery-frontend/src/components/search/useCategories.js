import { useEffect, useState } from "react";
import { metaApi } from "../../lib/api";
import { CATEGORIES as FALLBACK_CATEGORIES } from "../../lib/constants";

// Slugs that ship as "venue" style listings even if an older category row
// in the DB hasn't been tagged is_venue_type yet. Used only as a safety net -
// the super admin's is_venue_type flag always wins when present.
const KNOWN_VENUE_SLUGS = ["marriage-hall", "banquet-hall", "party-lawn", "farmhouse"];

function normalize(raw) {
  return {
    id: raw.id ?? raw.slug,
    slug: raw.slug,
    label: raw.name || raw.label,
    icon: raw.icon || "sparkles",
    isVenue: raw.is_venue_type != null ? !!raw.is_venue_type : KNOWN_VENUE_SLUGS.includes(raw.slug),
  };
}

/**
 * useCategories
 *
 * Single source of truth for "which categories exist" on every search-page
 * component. Pulls live, super-admin-managed categories from
 * GET /meta/categories (same endpoint the homepage uses) so a category
 * added/renamed/hidden in the admin panel shows up here automatically -
 * no more hardcoded list going stale.
 *
 * Falls back to the local CATEGORIES constant only if the API call fails,
 * so the filter UI never renders empty.
 */
export default function useCategories() {
  const [categories, setCategories] = useState(() => FALLBACK_CATEGORIES.map(normalize));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    metaApi
      .get("/categories")
      .then(({ data }) => {
        if (cancelled) return;
        const live = (data?.data || []).map(normalize);
        if (live.length > 0) setCategories(live);
      })
      .catch(() => {
        /* keep fallback list */
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const venueCategories = categories.filter((c) => c.isVenue);
  const vendorCategories = categories.filter((c) => !c.isVenue);

  return { categories, venueCategories, vendorCategories, loading };
}