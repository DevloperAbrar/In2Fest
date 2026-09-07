import React from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/common/Card";
import { CheckCircle2, MessageSquare, Star, AlertTriangle } from "lucide-react";

function Row({ icon: Icon, tone, text, to }) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700"
  }[tone];

  const content = (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${toneClass}`}>
      <Icon size={16} className="flex-shrink-0" />
      <p className="text-sm font-medium flex-1">{text}</p>
    </div>
  );

  return to ? <Link to={to} className="block hover:opacity-80 transition-opacity">{content}</Link> : content;
}

export default function NeedsAttention({ newInquiriesCount = 0, unrepliedReviewsCount = 0, pendingReviewsCount = 0, whatsappFailedCount = 0 }) {
  const items = [];

  if (newInquiriesCount > 0) {
    items.push({
      icon: MessageSquare,
      tone: "blue",
      text: `${newInquiriesCount} new inquir${newInquiriesCount === 1 ? "y needs" : "ies need"} a response`,
      to: "/dashboard/inquiries"
    });
  }
  if (unrepliedReviewsCount > 0) {
    items.push({
      icon: Star,
      tone: "amber",
      text: `${unrepliedReviewsCount} review${unrepliedReviewsCount === 1 ? "" : "s"} awaiting your reply`,
      to: "/dashboard/reviews"
    });
  }
  if (pendingReviewsCount > 0) {
    items.push({
      icon: Star,
      tone: "amber",
      text: `${pendingReviewsCount} review${pendingReviewsCount === 1 ? "" : "s"} awaiting moderation`,
      to: "/dashboard/reviews"
    });
  }
  if (whatsappFailedCount > 0) {
    items.push({
      icon: AlertTriangle,
      tone: "red",
      text: `${whatsappFailedCount} WhatsApp message${whatsappFailedCount === 1 ? "" : "s"} failed to deliver (last 30 days)`,
      to: null
    });
  }

  return (
    <Card title="Needs Your Attention">
      {items.length === 0 ? (
        <div className="flex items-center gap-3 p-3 text-sm text-gray-500">
          <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
          You're all caught up. Nothing needs attention right now.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => <Row key={idx} {...item} />)}
        </div>
      )}
    </Card>
  );
}