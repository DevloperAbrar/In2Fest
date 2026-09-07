import React from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/common/Card";
import { CheckCircle2, Star, ListTree, AlertTriangle } from "lucide-react";

function Row({ icon: Icon, tone, text, to }) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700"
  }[tone];

  return (
    <Link to={to} className="block hover:opacity-80 transition-opacity">
      <div className={`flex items-center gap-3 p-3 rounded-lg ${toneClass}`}>
        <Icon size={16} className="flex-shrink-0" />
        <p className="text-sm font-medium flex-1">{text}</p>
      </div>
    </Link>
  );
}

export default function AttentionQueue({ pendingReviewModerationCount = 0, pendingFreeListingsCount = 0, whatsappFailedCount = 0 }) {
  const items = [];

  if (pendingReviewModerationCount > 0) {
    items.push({
      icon: Star,
      tone: "amber",
      text: `${pendingReviewModerationCount} review${pendingReviewModerationCount === 1 ? "" : "s"} awaiting moderation`,
      to: "/admin/discovery/reviews"
    });
  }
  if (pendingFreeListingsCount > 0) {
    items.push({
      icon: ListTree,
      tone: "blue",
      text: `${pendingFreeListingsCount} free listing${pendingFreeListingsCount === 1 ? "" : "s"} awaiting approval`,
      to: "/admin/discovery/free-listings"
    });
  }
  if (whatsappFailedCount > 0) {
    items.push({
      icon: AlertTriangle,
      tone: "red",
      text: `${whatsappFailedCount} WhatsApp message${whatsappFailedCount === 1 ? "" : "s"} failed platform-wide (last 30 days)`,
      to: "/admin/whatsapp"
    });
  }

  return (
    <Card title="Moderation Queue">
      {items.length === 0 ? (
        <div className="flex items-center gap-3 p-3 text-sm text-gray-500">
          <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
          Nothing pending. Queue is clear.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => <Row key={idx} {...item} />)}
        </div>
      )}
    </Card>
  );
}