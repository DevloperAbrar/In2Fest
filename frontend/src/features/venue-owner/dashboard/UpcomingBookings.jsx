import React from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import EmptyState from "../../../components/common/EmptyState";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { CalendarCheck } from "lucide-react";

export default function UpcomingBookings({ bookings = [] }) {
  return (
    <Card
      title="Upcoming Bookings"
      action={<Link to="/dashboard/bookings" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>}
    >
      {bookings.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No upcoming bookings" description="Confirmed events will show up here." />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link
              key={b.id}
              to="/dashboard/bookings"
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{b.clientName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(b.eventDate)}{b.eventType ? ` · ${b.eventType}` : ""}{b.slotName ? ` · ${b.slotName}` : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <Badge status={b.status} />
                {b.balancePending > 0 && (
                  <p className="text-xs text-amber-600 mt-1">{formatCurrency(b.balancePending)} due</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}