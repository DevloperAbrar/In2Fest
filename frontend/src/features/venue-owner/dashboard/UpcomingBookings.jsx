import React from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import Badge from "../../../components/common/Badge";
import { formatCurrency } from "../../../lib/formatters";
import { ChevronRight } from "lucide-react";
import { DashEmpty, SectionHeader, Surface } from "./dashboardUi.jsx";

export default function UpcomingBookings({ bookings = [] }) {
  return (
    <Surface className="p-4 md:p-5 h-full">
      <SectionHeader title="Upcoming bookings" to="/dashboard/bookings" />
      {bookings.length === 0 ? (
        <DashEmpty kind="calendar" title="No upcoming bookings" description="Confirmed events will show up here." />
      ) : (
        <div className="-mx-2 space-y-0.5">
          {bookings.map((b) => {
            const d = dayjs(b.eventDate);
            return (
              <Link
                key={b.id}
                to="/dashboard/bookings"
                className="tap-scale flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-navy-50/70 transition-colors"
              >
                <div className="w-11 h-12 rounded-xl bg-navy-50 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9.5px] font-semibold uppercase tracking-wider text-primary-600 leading-none">
                    {d.isValid() ? d.format("MMM") : "—"}
                  </span>
                  <span className="font-display font-bold text-[17px] text-navy-900 leading-none mt-1">
                    {d.isValid() ? d.format("D") : "–"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-navy-900 truncate">{b.clientName}</p>
                  <p className="text-xs text-navy-400 mt-0.5 truncate">
                    {[b.eventType, b.slotName].filter(Boolean).join(" · ") || "Booking"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Badge status={b.status} />
                  {b.balancePending > 0 && (
                    <p className="text-[11px] text-amber-600 mt-1 font-medium">{formatCurrency(b.balancePending)} due</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-navy-300 shrink-0 hidden sm:block" />
              </Link>
            );
          })}
        </div>
      )}
    </Surface>
  );
}