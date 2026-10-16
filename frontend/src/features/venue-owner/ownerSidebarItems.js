import {
  LayoutDashboard, Globe, CalendarClock, MessageSquare, CalendarCheck,
  Users, Receipt, BarChart3, Settings, Store, Star, Gift, Package, Dumbbell, Boxes
} from "lucide-react";

export const ownerSidebarItems = [
  { navKey: "dashboard",   path: "/dashboard",                     label: "Dashboard",           icon: LayoutDashboard, primaryNav: true },
  { navKey: "gym",         path: "/dashboard/gym",                 label: "Gym",                 icon: Dumbbell,        requiredFeature: "gym", categorySlugs: ["gym-fitness"], primaryNav: true },
  { navKey: "inquiries",   path: "/dashboard/inquiries",           label: "Inquiries",           icon: MessageSquare,   requiredFeature: "inquiries",          primaryNav: true },
  { navKey: "bookings",    path: "/dashboard/bookings",            label: "Bookings",            icon: CalendarCheck,   requiredFeature: "bookings",           primaryNav: true },
  { navKey: "catalog",     path: "/dashboard/catalog",             label: "Products & Catalog",  icon: Package,         requiredFeature: "billing",            businessTypes: ["retail"], primaryNav: true },
  { navKey: "inventory",   path: "/dashboard/inventory",           label: "Inventory",           icon: Boxes,           requiredFeature: "billing",            businessTypes: ["retail"], primaryNav: true },
  { navKey: "clients",     path: "/dashboard/clients",             label: "Clients",             icon: Users,           requiredFeature: "clients",            primaryNav: true },
  { navKey: "website",     path: "/dashboard/website",             label: "Website Builder",     icon: Globe,           requiredFeature: "website_builder" },
  { navKey: "marketplace", path: "/dashboard/marketplace-profile", label: "Marketplace Profile", icon: Store,           requiredFeature: "marketplace_profile" },
  { navKey: "reviews",     path: "/dashboard/reviews",             label: "Reviews",             icon: Star,            requiredFeature: "reviews" },
  { navKey: "slots",       path: "/dashboard/slots",               label: "Slots",               icon: CalendarClock,   requiredFeature: "slots" },
  { navKey: "billing",     path: "/dashboard/billing/invoice",     label: "Billing",             icon: Receipt,         requiredFeature: "billing" },
  { navKey: "referrals",   path: "/dashboard/referrals",           label: "Referrals",           icon: Gift },
  { navKey: "analytics",   path: "/dashboard/analytics",           label: "Analytics",           icon: BarChart3 },
  { navKey: "settings",    path: "/dashboard/settings",            label: "Settings",            icon: Settings }
];