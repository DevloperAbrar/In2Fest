import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Users2, Star, Wallet, ShieldCheck } from "lucide-react";

function formatINR(n) {
  const num = Number(n);
  if (!num) return null;
  if (num >= 100000) return `₹${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
  return `₹${num.toLocaleString("en-IN")}`;
}

/**
 * SearchStats
 *
 * A lightweight, purely client-side insight strip computed from the vendors
 * already on the current results page - zero extra API calls, so it stays
 * cheap no matter how big the catalogue gets. Gives people the kind of
 * "at a glance" summary WeddingWire/Zola show above results, without the
 * cost of a dedicated analytics endpoint.
 */
export default function SearchStats({ vendors = [], total = 0 }) {
  const stats = useMemo(() => {
    if (!vendors.length) return null;

    const rated = vendors.filter((v) => v.average_rating > 0);
    const avgRating = rated.length
      ? (rated.reduce((s, v) => s + Number(v.average_rating), 0) / rated.length).toFixed(1)
      : null;

    const prices = vendors.map((v) => Number(v.starting_price)).filter((p) => p > 0);
    const minPrice = prices.length ? Math.min(...prices) : null;

    const verifiedCount = vendors.filter(
      (v) => v.badge_verified_business || v.badge_documents_verified
    ).length;

    return { avgRating, minPrice, verifiedCount };
  }, [vendors]);

  if (!stats) return null;

  const items = [
    { icon: Users2, label: "Vendors found", value: total.toLocaleString("en-IN") },
    stats.avgRating && { icon: Star, label: "Avg. rating on this page", value: `${stats.avgRating} ★` },
    stats.minPrice && { icon: Wallet, label: "Starting from", value: formatINR(stats.minPrice) },
    stats.verifiedCount > 0 && { icon: ShieldCheck, label: "Verified on this page", value: stats.verifiedCount },
  ].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-xl px-3.5 py-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
            <item.icon size={15} className="text-navy-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-navy-900 leading-tight truncate">{item.value}</p>
            <p className="text-[11px] text-gray-400 leading-tight truncate">{item.label}</p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}