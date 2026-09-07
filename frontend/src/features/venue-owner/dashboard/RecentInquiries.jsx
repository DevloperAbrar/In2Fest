import React from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import EmptyState from "../../../components/common/EmptyState";
import { formatDate } from "../../../lib/formatters";
import { MessageSquare } from "lucide-react";

export default function RecentInquiries({ inquiries = [] }) {
  return (
    <Card
      title="Recent Inquiries"
      action={<Link to="/dashboard/inquiries" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>}
    >
      {inquiries.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No inquiries yet" description="New enquiries from your website or the marketplace will show up here." />
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <Link
              key={inq.id}
              to={`/dashboard/inquiries/${inq.id}`}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{inq.customer_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(inq.event_date)}{inq.event_type ? ` · ${inq.event_type}` : ""}
                  {inq.source === "marketplace" ? " · via Marketplace" : ""}
                </p>
              </div>
              <Badge status={inq.status} />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}