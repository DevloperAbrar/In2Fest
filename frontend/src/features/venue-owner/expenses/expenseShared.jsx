import React, { useMemo } from "react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";

export { inr, todayISO, errMsg, fmtDate, downloadBlob, Field } from "../gym/gymShared.jsx";

export const MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" }
];

export const COST_GROUPS = [
  { value: "cogs", label: "Direct cost (stock, materials)" },
  { value: "people", label: "People (salaries)" },
  { value: "fixed", label: "Fixed (rent, bills)" },
  { value: "growth", label: "Growth (marketing)" },
  { value: "operations", label: "Operations" },
  { value: "capex", label: "One-time (equipment)" },
  { value: "other", label: "Other" }
];

export const inputCls = "w-full px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";

export const Panel = ({ className = "", children }) => (
  <div className={`bg-white rounded-2xl border border-navy-100/70 shadow-card ${className}`}>{children}</div>
);

// "2026-11" helpers (UTC-safe, no timezone drift)
export const shiftMonth = (key, n) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};
export const monthEndISO = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
export const monthName = (key) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

export const compact = (v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v));

export function useExpenses() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data: meta, loading, refetch } = useFetch(vid ? `/venues/${vid}/expenses/meta` : null, { skip: !vid });
  const categories = useMemo(() => meta?.categories || [], [meta]);
  const categoryOf = useMemo(() => {
    const map = new Map(categories.map((c) => [`${c.kind}:${c.slug}`, c]));
    return (kind, slug) => map.get(`${kind}:${slug}`);
  }, [categories]);
  return { vid, meta, categories, categoryOf, loading, refetchMeta: refetch };
}