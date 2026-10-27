import React from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import Badge from "../../../components/common/Badge";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { ShieldAlert, ShieldCheck, Sparkles, ChevronRight } from "lucide-react";
import { Surface } from "./dashboardUi.jsx";

export default function SubscriptionCard({ venue }) {
  const sub = venue?.subscription;

  if (!sub) {
    return (
      <Surface className="p-5 h-full">
        <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <ShieldAlert size={19} />
        </span>
        <p className="mt-3 font-display font-semibold text-navy-900 text-[15px]">No active subscription</p>
        <p className="text-xs text-navy-400 mt-1">Choose a plan to unlock your dashboard features.</p>
        <Link
          to="/dashboard/settings/subscription"
          className="tap-scale mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-primary-600"
        >
          View plans <ChevronRight size={14} />
        </Link>
      </Surface>
    );
  }

  const endDate = sub.status === "trial" ? sub.trial_ends_at : sub.current_period_end;
  const daysLeft = endDate ? dayjs(endDate).diff(dayjs(), "day") : null;
  const urgent = daysLeft !== null && daysLeft <= 7;
  const needsAction = urgent || sub.status === "expired" || sub.status === "suspended";

  return (
    <Surface className="p-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              urgent ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {urgent ? <ShieldAlert size={19} /> : <ShieldCheck size={19} />}
          </span>
          <p className="font-display font-semibold text-navy-900 text-[15px] truncate">{sub.plan?.name || "Your Plan"}</p>
        </div>
        <Badge status={sub.status} />
      </div>

      <p className="mt-5 font-display font-bold text-[28px] leading-none text-navy-900 tabular-nums">
        {formatCurrency(sub.locked_price)}
        <span className="text-xs font-medium text-navy-400 ml-1">{sub.billing_cycle === "yearly" ? "/yr" : "/mo"}</span>
      </p>

      {endDate && (
        <p className={`text-xs mt-2.5 ${urgent ? "text-amber-600 font-medium" : "text-navy-400"}`}>
          {sub.status === "trial" ? "Trial ends" : "Renews"} {formatDate(endDate)}
          {daysLeft !== null && daysLeft >= 0 ? ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}
        </p>
      )}

      {needsAction && (
        <Link
          to="/dashboard/settings/subscription"
          className="tap-scale mt-auto pt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-600"
        >
          <Sparkles size={14} /> {sub.status === "trial" ? "Upgrade now" : "Renew now"}
        </Link>
      )}
    </Surface>
  );
}