import { useEffect, useMemo, useState } from "react";
import { metaApi } from "../../lib/api";
import { CATEGORIES as FALLBACK_CATEGORIES } from "../../lib/constants";
import { annotateCategory, sortByPriority, buildLiveGroups } from "../../lib/launchConfig";

// Slugs that ship as "venue" style listings even if an older category row
// in the DB hasn't been tagged is_venue_type yet. Used only as a safety net -
// the super admin's is_venue_type flag always wins when present.
const KNOWN_VENUE_SLUGS = ["marriage-hall", "banquet-hall", "party-lawn", "farmhouse"];

function normalize(raw, index) {
  return annotateCategory(
    {
      id: raw.id ?? raw.slug,
      slug: raw.slug,
      label: raw.name || raw.label,
      icon: raw.icon || "sparkles",
      isVenue: raw.is_venue_type != null ? !!raw.is_venue_type : KNOWN_VENUE_SLUGS.includes(raw.slug),
      businessType: raw.business_type || "general",
      businessTypeLabel: raw.business_type_label || "More categories",
      businessTypeOrder: raw.business_type_order ?? 0,
      imageUrl: raw.image_url || null,
      tagline: raw.tagline || "",
      showOnHome: raw.show_on_home !== false,
    },
    index
  );
}

// The offline fallback list only contains event categories.
const FALLBACK = sortByPriority(
  FALLBACK_CATEGORIES.map((c, i) => normalize({ ...c, business_type: "events" }, i))
);

/**
 * useCategories
 *
 * Single source of truth for "which categories exist and which are live".
 * Pulls super-admin-managed categories from GET /meta/categories, then sorts
 * them by launch priority (see lib/launchConfig.js):
 *
 *   categories        every category, live ones first in priority order
 *   liveCategories    only the categories we have onboarded vendors for
 *   soonCategories    everything else (shown as "Launching soon")
 *   liveGroups        [{ group, items }] for live groups, in priority order
 *   venueCategories / vendorCategories   live categories only (used by filters)
 *
 * Falls back to the local list only if the API call fails, so the UI never
 * renders empty.
 */
export default function useCategories() {
  const [categories, setCategories] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    metaApi
      .get("/categories")
      .then(({ data }) => {
        if (cancelled) return;
        const live = (data?.data || []).map((row, i) => normalize(row, i));
        if (live.length > 0) setCategories(sortByPriority(live));
      })
      .catch(() => {
        /* keep fallback list */
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const liveCategories = categories.filter((c) => c.isLive);
    const soonCategories = categories.filter((c) => !c.isLive);
    return {
      categories,
      liveCategories,
      soonCategories,
      liveGroups: buildLiveGroups(categories),
      venueCategories: liveCategories.filter((c) => c.isVenue),
      vendorCategories: liveCategories.filter((c) => !c.isVenue),
      loading,
    };
  }, [categories, loading]);
}