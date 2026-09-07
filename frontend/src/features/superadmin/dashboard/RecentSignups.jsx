import React from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import EmptyState from "../../../components/common/EmptyState";
import { formatDate } from "../../../lib/formatters";
import { Building2 } from "lucide-react";

export default function RecentSignups({ venues = [] }) {
  return (
    <Card
      title="Recent Signups"
      action={<Link to="/admin/venues" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>}
    >
      {venues.length === 0 ? (
        <EmptyState icon={Building2} title="No signups yet" />
      ) : (
        <div className="space-y-3">
          {venues.map((v) => (
            <Link
              key={v.id}
              to={`/admin/venues/${v.id}`}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{v.hall_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{v.city || " -"} · {v.subdomain} · {formatDate(v.created_at)}</p>
              </div>
              <Badge status={v.is_active ? "active" : "suspended"}>{v.is_active ? "Active" : "Suspended"}</Badge>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}