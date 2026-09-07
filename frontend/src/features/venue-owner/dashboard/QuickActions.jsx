import React from "react";
import { Link } from "react-router-dom";
import { MessageSquare, CalendarCheck, Users, Globe, Receipt, Star } from "lucide-react";

const ACTIONS = [
  { label: "Inquiries", to: "/dashboard/inquiries", icon: MessageSquare, feature: "inquiries" },
  { label: "Bookings", to: "/dashboard/bookings", icon: CalendarCheck, feature: "bookings" },
  { label: "Clients", to: "/dashboard/clients", icon: Users, feature: "clients" },
  { label: "Edit Website", to: "/dashboard/website", icon: Globe, feature: "website_builder" },
  { label: "New Invoice", to: "/dashboard/billing/invoice", icon: Receipt, feature: "billing" },
  { label: "Reviews", to: "/dashboard/reviews", icon: Star, feature: "reviews" }
];

export default function QuickActions({ planFeatures = [] }) {
  const available = ACTIONS.filter((a) => planFeatures.includes(a.feature));
  if (available.length === 0) return null;

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
      {available.map((a) => (
        <Link
          key={a.to}
          to={a.to}
          className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
            <a.icon size={18} />
          </div>
          <span className="text-xs font-medium text-gray-700">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}