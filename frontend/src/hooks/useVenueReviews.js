import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-09-18" -> "Sep 2026"
function monthYear(dateStr) {
  if (!dateStr) return "";
  const [y, m] = String(dateStr).split("-");
  const label = MONTHS[Number(m) - 1];
  return label && y ? `${label} ${y}` : "";
}

// Converts a marketplace review into the card shape the website sections render
function toCard(r) {
  const meta = [r.event_type, monthYear(r.event_date)].filter(Boolean).join(" · ");
  return {
    id: r.id,
    name: r.reviewer_name,
    rating: r.star_rating,
    description: r.review_text,
    location: meta,
    reply: r.owner_reply || "",
  };
}

// Reads the SAME approved reviews shown on the vendor's Marketplace profile.
// Public endpoint: GET /api/reviews/venue/:venueId (no login needed).
export function useVenueReviews(venueId, limit = 6) {
  const [state, setState] = useState({
    reviews: [],
    averageRating: null,
    reviewCount: 0,
    loading: true,
  });

  useEffect(() => {
    if (!venueId) return undefined;
    let cancelled = false;

    axiosInstance
      .get(`/reviews/venue/${venueId}`)
      .then(({ data }) => {
        if (cancelled) return;
        const d = data?.data || {};
        setState({
          reviews: (d.reviews || [])
            .filter((r) => r.review_text && r.review_text.trim())
            .slice(0, limit)
            .map(toCard),
          averageRating: d.average_rating ?? null,
          reviewCount: d.review_count || 0,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [venueId, limit]);

  return state;
}