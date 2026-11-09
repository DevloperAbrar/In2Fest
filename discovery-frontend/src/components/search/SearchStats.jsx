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
 * Lightweight insight strip computed from the vendors already on the page.
 * Zero extra API calls. Only real numbers, nothing is invented.
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
    { icon: Users2, label: "Businesses found", value: total.toLocaleString("en-IN"), bg: "#FFE6D6", fg: "#e8192c" },
    stats.avgRating && { icon: Star, label: "Avg. rating on this page", value: `${stats.avgRating} ★`, bg: "#FFF0C2", fg: "#d38a10" },
    stats.minPrice && { icon: Wallet, label: "Starting from", value: formatINR(stats.minPrice), bg: "#DDF3E8", fg: "#0f8a5f" },
    stats.verifiedCount > 0 && { icon: ShieldCheck, label: "Verified on this page", value: stats.verifiedCount, bg: "#E0EAFF", fg: "#3a5bd9" },
  ].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 bg-white border border-navy-100 rounded-2xl px-3.5 py-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.bg }}>
            <item.icon size={18} style={{ color: item.fg }} />
          </div>
          <div className="min-w-0">
            <p className="text-base font-display font-extrabold text-navy-700 leading-tight truncate">{item.value}</p>
            <p className="text-[11px] text-navy-400 leading-tight truncate">{item.label}</p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}