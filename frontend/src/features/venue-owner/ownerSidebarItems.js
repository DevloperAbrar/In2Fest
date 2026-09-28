import {
  LayoutDashboard, Globe, CalendarClock, MessageSquare, CalendarCheck,
  Users, Receipt, BarChart3, Settings, Store, Star, Gift
} from "lucide-react";

export const ownerSidebarItems = [
  { path: "/dashboard",                     label: "Dashboard",           icon: LayoutDashboard, primaryNav: true },
  { path: "/dashboard/inquiries",           label: "Inquiries",           icon: MessageSquare,   requiredFeature: "inquiries",          primaryNav: true },
  { path: "/dashboard/bookings",            label: "Bookings",            icon: CalendarCheck,   requiredFeature: "bookings",           primaryNav: true },
  { path: "/dashboard/clients",             label: "Clients",             icon: Users,           requiredFeature: "clients",            primaryNav: true },
  { path: "/dashboard/website",             label: "Website Builder",     icon: Globe,           requiredFeature: "website_builder" },
  { path: "/dashboard/marketplace-profile", label: "Marketplace Profile", icon: Store,           requiredFeature: "marketplace_profile" },
  { path: "/dashboard/reviews",             label: "Reviews",             icon: Star,            requiredFeature: "reviews" },
  { path: "/dashboard/slots",               label: "Slots",               icon: CalendarClock,   requiredFeature: "slots" },
  { path: "/dashboard/billing/invoice",     label: "Billing",             icon: Receipt,         requiredFeature: "billing" },
  { path: "/dashboard/referrals",           label: "Referrals",           icon: Gift },
  { path: "/dashboard/analytics",           label: "Analytics",           icon: BarChart3 },
  { path: "/dashboard/settings",            label: "Settings",            icon: Settings },
];