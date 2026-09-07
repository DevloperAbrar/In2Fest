import React from "react";
import KpiCard from "../../../components/common/KpiCard";
import { formatCurrency } from "../../../lib/formatters";
import {
  Building2, IndianRupee, Wallet, UserCheck, TrendingUp, ShieldAlert, Hourglass, Ban
} from "lucide-react";

export default function StatsCards({ stats }) {
  if (!stats) return null;

  const items = [
    { icon: Building2, label: "Total Venues", value: stats.totalVenues ?? 0, accent: "#7c3aed" },
    { icon: IndianRupee, label: "MRR", value: formatCurrency(stats.mrr), accent: "#10b981" },
    { icon: Wallet, label: "ARPU", value: formatCurrency(stats.arpu), sublabel: "per active venue", accent: "#3b82f6" },
    { icon: UserCheck, label: "Active Subscriptions", value: stats.activeSubs ?? 0, accent: "#10b981" },
    { icon: TrendingUp, label: "New Signups (7d)", value: stats.newSignupsThisWeek ?? 0, accent: "#f59e0b" },
    { icon: Hourglass, label: "Trial Venues", value: stats.trialSubs ?? 0, accent: "#3b82f6" },
    { icon: ShieldAlert, label: "Expiring Soon", value: stats.expiringSoon ?? 0, accent: "#f59e0b" },
    { icon: Ban, label: "Suspended / Expired", value: (stats.suspendedVenues ?? 0) + (stats.expiredSubs ?? 0), accent: "#ef4444" }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </div>
  );
}