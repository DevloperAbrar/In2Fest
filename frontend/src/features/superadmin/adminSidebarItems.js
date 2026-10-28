import {
  LayoutDashboard, Building2, CreditCard, MessageCircle, BarChart3, Settings, ListTree, Star,
  Store, ShieldCheck, MapPin, LineChart, Layers, BellRing, Megaphone, Users, LogIn, Layers3,
  Funnel, Database, PlayCircle
} from "lucide-react";

// Items with a `section` key render as a group heading in the Sidebar (no link).
export const adminSidebarItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },

  { section: "Users" },
  { path: "/admin/registrations", label: "Registrations", icon: Users },
  { path: "/admin/logins", label: "Login Activity", icon: LogIn },

  { section: "Vendors & Revenue" },
  { path: "/admin/venues", label: "Venues", icon: Building2 },
  { path: "/admin/demo-accounts", label: "Demo Accounts", icon: PlayCircle },
  { path: "/admin/plan-vendors", label: "Plan-wise Vendors", icon: Layers3 },
  { path: "/admin/plans", label: "Plans", icon: ListTree },
  { path: "/admin/payments", label: "Payments", icon: CreditCard },

  { section: "Marketplace" },
  { path: "/admin/marketplace", label: "Marketplace Overview", icon: Funnel },
  { path: "/admin/discovery/free-listings", label: "Free Listings", icon: ListTree },
  { path: "/admin/discovery/featured-vendors", label: "Featured Vendors", icon: Store },
  { path: "/admin/discovery/reviews", label: "Review Moderation", icon: Star },
  { path: "/admin/discovery/badges", label: "Verification Badges", icon: ShieldCheck },
  { path: "/admin/discovery/cities", label: "City Manager", icon: MapPin },
  { path: "/admin/discovery/city-requests", label: "City Requests", icon: BellRing },
  { path: "/admin/discovery/categories", label: "Category Manager", icon: Layers },
  { path: "/admin/discovery/analytics", label: "Marketplace Analytics", icon: LineChart },

  { section: "Communication" },
  { path: "/admin/whatsapp", label: "WhatsApp Center", icon: MessageCircle },
  { path: "/admin/announcements", label: "Announcements", icon: Megaphone },

  { section: "System" },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/admin/system", label: "Database & System", icon: Database },
  { path: "/admin/settings", label: "Settings", icon: Settings }
];