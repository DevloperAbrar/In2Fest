import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, Users, Armchair, Clock, CalendarCheck, Wallet, Settings, BookOpen, Bell } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useAuth } from "../../../context/AuthContext";
import { useVenue } from "../../../context/VenueContext.jsx";

export { inr, fmtDate, todayISO, errMsg, downloadBlob, waUrl, Field, TextArea } from "../gym/gymShared.jsx";

export const MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" }
];

export const fmtTime = (t) => {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const shiftRange = (s) => `${fmtTime(s.start_time)} - ${fmtTime(s.end_time)}`;

export function useLib() {
  const { venue } = useVenue();
  const { user } = useAuth();
  return { vid: venue?.id, venue, isOwner: user?.role !== "team_member", user };
}

const STATUS = {
  active: ["Active", "bg-emerald-50 text-emerald-700 ring-emerald-200/70", "bg-emerald-500"],
  expiring: ["Expiring", "bg-amber-50 text-amber-700 ring-amber-200/70", "bg-amber-500"],
  expired: ["Expired", "bg-red-50 text-red-700 ring-red-200/70", "bg-red-500"],
  frozen: ["Frozen", "bg-sky-50 text-sky-700 ring-sky-200/70", "bg-sky-500"],
  left: ["Left", "bg-navy-50 text-navy-600 ring-navy-200/70", "bg-navy-400"],
  new: ["New", "bg-violet-50 text-violet-700 ring-violet-200/70", "bg-violet-500"]
};

export function LibStatus({ status, daysLeft }) {
  const [label, cls, dot] = STATUS[status] || STATUS.new;
  let extra = "";
  if (status === "expiring") extra = daysLeft === 0 ? " · today" : ` · ${daysLeft}d`;
  if (status === "expired" && daysLeft != null) extra = ` · ${Math.abs(daysLeft)}d ago`;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium whitespace-nowrap ring-1 ring-inset ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}{extra}
    </span>
  );
}

export const Panel = ({ className = "", children }) => (
  <div className={`bg-white rounded-2xl border border-navy-100/70 shadow-card ${className}`}>{children}</div>
);

export const Meter = ({ percent = 0 }) => (
  <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
    <div className={`h-full rounded-full ${percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(percent, 100)}%` }} />
  </div>
);

const TABS = [
    { to: "/dashboard/library", label: "Dashboard", icon: LayoutGrid, end: true },
    { to: "/dashboard/library/students", label: "Students", icon: Users },
    { to: "/dashboard/library/halls", label: "Halls & Seats", icon: Armchair },
    { to: "/dashboard/library/shifts", label: "Shifts", icon: Clock },
    { to: "/dashboard/library/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/dashboard/library/payments", label: "Payments", icon: Wallet },
    { to: "/dashboard/library/books", label: "Books", icon: BookOpen },
    { to: "/dashboard/library/reminders", label: "Reminders", icon: Bell }
  ];
const SETTINGS_TAB = { to: "/dashboard/library/settings", label: "Settings", icon: Settings };

export function LibraryPage({ title, subtitle, actions, children }) {
  const { isOwner } = useLib();
  const tabs = isOwner ? [...TABS, SETTINGS_TAB] : TABS;
  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Library">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-navy-900 truncate">{title}</h1>
          {subtitle && <p className="text-[13px] text-navy-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">{actions}</div>
      </div>
      <nav aria-label="Library sections" className="mb-4 -mx-4 md:mx-0 overflow-x-auto px-4 md:px-0 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-2 w-max md:w-auto md:flex-wrap">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={!!end}
              className={({ isActive }) =>
                `tap-scale shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors ${
                  isActive ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-600 border-navy-100 hover:bg-navy-50"
                }`
              }
            >
              <Icon size={15} strokeWidth={2.1} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      {children}
    </DashboardLayout>
  );
}