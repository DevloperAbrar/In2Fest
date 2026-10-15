import React from "react";
import { Link } from "react-router-dom";
import { MessageSquare, CalendarCheck, Users, Globe, Receipt, Star, Package } from "lucide-react";
import { useBusinessProfile } from "../../../hooks/useBusinessProfile";

const ACTIONS = [
  { label: "Products", to: "/dashboard/catalog", icon: Package, feature: "billing", businessTypes: ["retail"] },
  { label: "Inquiries", to: "/dashboard/inquiries", icon: MessageSquare, feature: "inquiries", term: "inquiries" },
  { label: "Bookings", to: "/dashboard/bookings", icon: CalendarCheck, feature: "bookings", term: "bookings" },
  { label: "Clients", to: "/dashboard/clients", icon: Users, feature: "clients", term: "clients" },
  { label: "Edit Website", to: "/dashboard/website", icon: Globe, feature: "website_builder" },
  { label: "New Invoice", to: "/dashboard/billing/invoice", icon: Receipt, feature: "billing" },
  { label: "Reviews", to: "/dashboard/reviews", icon: Star, feature: "reviews" }
];

export default function QuickActions({ planFeatures = [] }) {
  const { profile, terms, loading } = useBusinessProfile();
  if (loading) return null;

  const modules = profile?.modules || null;
  const available = ACTIONS.filter((a) => {
    if (!planFeatures.includes(a.feature)) return false;
    if (modules && !modules.includes(a.feature)) return false; // e.g. no Bookings for a shop
    if (a.businessTypes && !(profile && a.businessTypes.includes(profile.key))) return false;
    return true;
  }).map((a) => (a.term && terms[a.term] ? { ...a, label: terms[a.term] } : a));

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