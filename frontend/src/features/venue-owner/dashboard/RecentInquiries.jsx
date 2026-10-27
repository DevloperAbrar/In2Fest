import React from "react";
import { Link } from "react-router-dom";
import Badge from "../../../components/common/Badge";
import { formatDate } from "../../../lib/formatters";
import { ChevronRight } from "lucide-react";
import { DashEmpty, InitialsAvatar, SectionHeader, Surface } from "./dashboardUi.jsx";

export default function RecentInquiries({ inquiries = [] }) {
  return (
    <Surface className="p-4 md:p-5 h-full">
      <SectionHeader title="Recent inquiries" to="/dashboard/inquiries" />
      {inquiries.length === 0 ? (
        <DashEmpty
          kind="chat"
          title="No inquiries yet"
          description="New enquiries from your website or the marketplace will show up here."
        />
      ) : (
        <div className="-mx-2 space-y-0.5">
          {inquiries.map((inq) => (
            <Link
              key={inq.id}
              to={`/dashboard/inquiries/${inq.id}`}
              className="tap-scale flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-navy-50/70 transition-colors"
            >
              <InitialsAvatar name={inq.customer_name} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-navy-900 truncate">{inq.customer_name}</p>
                <p className="text-xs text-navy-400 mt-0.5 truncate">
                  {[inq.event_date ? formatDate(inq.event_date) : null, inq.event_type, inq.source === "marketplace" ? "via Marketplace" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Badge status={inq.status} />
              <ChevronRight size={16} className="text-navy-300 shrink-0 hidden sm:block" />
            </Link>
          ))}
        </div>
      )}
    </Surface>
  );
}