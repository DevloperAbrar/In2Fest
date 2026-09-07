import {
  LayoutDashboard, Globe, CalendarClock, MessageSquare, CalendarCheck,
  Users, Receipt, BarChart3, Settings, Store, Star
} from "lucide-react";

export const ownerSidebarItems = [
  { path: "/dashboard",                        label: "Dashboard",           i18nKey: "sidebar.dashboard",          icon: LayoutDashboard, primaryNav: true },
  { path: "/dashboard/inquiries",              label: "Inquiries",           i18nKey: "sidebar.inquiries",           icon: MessageSquare,   requiredFeature: "inquiries",          primaryNav: true },
  { path: "/dashboard/bookings",               label: "Bookings",            i18nKey: "sidebar.bookings",            icon: CalendarCheck,   requiredFeature: "bookings",           primaryNav: true },
  { path: "/dashboard/clients",                label: "Clients",             i18nKey: "sidebar.clients",             icon: Users,           requiredFeature: "clients",            primaryNav: true },
  { path: "/dashboard/website",                label: "Website Builder",     i18nKey: "sidebar.websiteBuilder",      icon: Globe,           requiredFeature: "website_builder" },
  { path: "/dashboard/marketplace-profile",    label: "Marketplace Profile", i18nKey: "sidebar.marketplaceProfile",  icon: Store,           requiredFeature: "marketplace_profile" },
  { path: "/dashboard/reviews",                label: "Reviews",             i18nKey: "sidebar.reviews",             icon: Star,            requiredFeature: "reviews" },
  { path: "/dashboard/slots",                  label: "Slots",               i18nKey: "sidebar.slots",               icon: CalendarClock,   requiredFeature: "slots" },
  { path: "/dashboard/billing/invoice",        label: "Billing",             i18nKey: "sidebar.billing",             icon: Receipt,         requiredFeature: "billing" },
  { path: "/dashboard/analytics",              label: "Analytics",           i18nKey: "sidebar.analytics",           icon: BarChart3 },
  { path: "/dashboard/settings",               label: "Settings",            i18nKey: "sidebar.settings",            icon: Settings },
];