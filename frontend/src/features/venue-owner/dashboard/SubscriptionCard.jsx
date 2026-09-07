import React from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";

export default function SubscriptionCard({ venue }) {
  const sub = venue?.subscription;
  if (!sub) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-amber-500" size={22} />
          <div>
            <p className="font-semibold text-gray-800 text-sm">No active subscription</p>
            <p className="text-xs text-gray-400">Choose a plan to unlock your dashboard features</p>
          </div>
        </div>
        <Link
          to="/dashboard/settings/subscription"
          className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline"
        >
          View Plans →
        </Link>
      </Card>
    );
  }

  const endDate = sub.status === "trial" ? sub.trial_ends_at : sub.current_period_end;
  const daysLeft = endDate ? dayjs(endDate).diff(dayjs(), "day") : null;
  const urgent = daysLeft !== null && daysLeft <= 7;

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {urgent ? <ShieldAlert className="text-amber-500" size={18} /> : <ShieldCheck className="text-green-600" size={18} />}
          <p className="font-semibold text-gray-800 text-sm">{sub.plan?.name || "Your Plan"}</p>
        </div>
        <Badge status={sub.status} />
      </div>

      <p className="text-2xl font-bold text-gray-900">{formatCurrency(sub.locked_price)}<span className="text-xs font-normal text-gray-400">/mo</span></p>

      {endDate && (
        <p className={`text-xs mt-2 ${urgent ? "text-amber-600 font-medium" : "text-gray-400"}`}>
          {sub.status === "trial" ? "Trial ends" : "Renews"} {formatDate(endDate)}
          {daysLeft !== null && daysLeft >= 0 ? ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}
        </p>
      )}

      {(urgent || sub.status === "expired" || sub.status === "suspended") && (
        <Link
          to="/dashboard/settings/subscription"
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"
        >
          <Sparkles size={14} /> {sub.status === "trial" ? "Upgrade now" : "Renew now"}
        </Link>
      )}
    </Card>
  );
}