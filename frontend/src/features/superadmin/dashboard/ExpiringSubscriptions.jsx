import React from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import EmptyState from "../../../components/common/EmptyState";
import { ShieldAlert } from "lucide-react";

export default function ExpiringSubscriptions({ subscriptions = [] }) {
  return (
    <Card
      title="Expiring Soon / Ending Trials"
      action={<Link to="/admin/venues" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>}
    >
      {subscriptions.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Nothing expiring soon" description="Trials and renewals in the next few days will show up here." />
      ) : (
        <div className="space-y-3">
          {subscriptions.map((s) => {
            const endDate = s.status === "trial" ? s.trialEndsAt : s.currentPeriodEnd;
            const daysLeft = endDate ? dayjs(endDate).diff(dayjs(), "day") : null;
            return (
              <Link
                key={s.id}
                to={`/admin/venues/${s.venueId}`}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.hallName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.city} · {s.planName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge status={s.status} />
                  {daysLeft !== null && (
                    <p className="text-xs text-gray-400 mt-1">
                      {daysLeft >= 0 ? `${daysLeft}d left` : "overdue"}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}