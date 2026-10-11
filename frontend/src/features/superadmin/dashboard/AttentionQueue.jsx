import React from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/common/Card";
import { CheckCircle2, Star, ListTree, AlertTriangle, Hourglass, CalendarClock, BellRing, CreditCard } from "lucide-react";

const TONES = {
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700"
};

function Row({ icon: Icon, tone, text, to }) {
  return (
    <Link to={to} className="block hover:opacity-80 transition-opacity">
      <div className={`flex items-center gap-3 p-3 rounded-lg ${TONES[tone]}`}>
        <Icon size={16} className="flex-shrink-0" />
        <p className="text-sm font-medium flex-1">{text}</p>
      </div>
    </Link>
  );
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function AttentionQueue({
  pendingReviewModerationCount = 0,
  pendingFreeListingsCount = 0,
  whatsappFailedCount = 0,
  trialsEndingSoon = 0,
  renewalsDue = 0,
  pendingCityRequests = 0,
  failedPayments = 0
}) {
  const items = [];

  if (pendingFreeListingsCount > 0) {
    items.push({
      icon: ListTree, tone: "blue", to: "/admin/discovery/free-listings",
      text: `${plural(pendingFreeListingsCount, "free listing")} awaiting approval`
    });
  }
  if (pendingReviewModerationCount > 0) {
    items.push({
      icon: Star, tone: "amber", to: "/admin/discovery/reviews",
      text: `${plural(pendingReviewModerationCount, "review")} awaiting moderation`
    });
  }
  if (trialsEndingSoon > 0) {
    items.push({
      icon: Hourglass, tone: "amber", to: "/admin/registrations?type=vendors&status=trial",
      text: `${plural(trialsEndingSoon, "trial")} ending within 3 days`
    });
  }
  if (renewalsDue > 0) {
    items.push({
      icon: CalendarClock, tone: "amber", to: "/admin/registrations?type=vendors&status=expiring_soon",
      text: `${plural(renewalsDue, "paid renewal")} due within 7 days`
    });
  }
  if (failedPayments > 0) {
    items.push({
      icon: CreditCard, tone: "red", to: "/admin/payments",
      text: `${plural(failedPayments, "failed payment")} in the last 30 days`
    });
  }
  if (pendingCityRequests > 0) {
    items.push({
      icon: BellRing, tone: "blue", to: "/admin/discovery/city-requests",
      text: `${plural(pendingCityRequests, "city request")} waiting for a launch notice`
    });
  }
  if (whatsappFailedCount > 0) {
    items.push({
      icon: AlertTriangle, tone: "red", to: "/admin/whatsapp",
      text: `${plural(whatsappFailedCount, "WhatsApp message")} failed platform-wide (last 30 days)`
    });
  }

  return (
    <Card title="Needs Attention">
      {items.length === 0 ? (
        <div className="flex items-center gap-3 p-3 text-sm text-gray-500">
          <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
          Nothing pending. Queue is clear.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => <Row key={item.text} {...item} />)}
        </div>
      )}
    </Card>
  );
}