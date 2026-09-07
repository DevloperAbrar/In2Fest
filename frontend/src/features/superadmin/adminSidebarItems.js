import {
  LayoutDashboard, Building2, CreditCard, MessageCircle, BarChart3,
  Settings, ListTree, Star, Store, ShieldCheck, MapPin, LineChart, Layers
} from "lucide-react";

export const adminSidebarItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/venues", label: "Venues", icon: Building2 },
  { path: "/admin/plans", label: "Plans", icon: ListTree },
  { path: "/admin/payments", label: "Payments", icon: CreditCard },
  { path: "/admin/whatsapp", label: "WhatsApp Center", icon: MessageCircle },
  { path: "/admin/discovery/featured-vendors", label: "Featured Vendors", icon: Store },
  { path: "/admin/discovery/reviews", label: "Review Moderation", icon: Star },
  { path: "/admin/discovery/free-listings", label: "Free Listings", icon: ListTree },
  { path: "/admin/discovery/badges", label: "Verification Badges", icon: ShieldCheck },
  { path: "/admin/discovery/cities", label: "City Manager", icon: MapPin },
  { path: "/admin/discovery/categories", label: "Category Manager", icon: Layers },
  { path: "/admin/discovery/analytics", label: "Marketplace Analytics", icon: LineChart },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/admin/settings", label: "Settings", icon: Settings }
];