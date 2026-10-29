import React from "react";
import { NavLink, Navigate } from "react-router-dom";
import { CalendarCheck, Users, Wallet } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useAuth } from "../../../context/AuthContext";

export const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const monthLabel = (m) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
export const shiftMonth = (m, n) => {
  const d = new Date(`${m}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const PAY_MODES = [
  { value: "cash", label: "Cash" }, { value: "upi", label: "UPI" }, { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" }, { value: "other", label: "Other" }
];

// "absent" in the database is shown as "Leave": the first N leave days of a month are free, the rest are deducted.
// "paid_leave" is never deducted. "holiday" is a paid off day.
export const STATUS = [
  { key: "present", label: "Present", on: "bg-emerald-600 text-white border-emerald-600", cell: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  { key: "absent", label: "Leave", on: "bg-red-600 text-white border-red-600", cell: "bg-red-100 text-red-800", dot: "bg-red-500" },
  { key: "half_day", label: "Half day", on: "bg-amber-500 text-white border-amber-500", cell: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  { key: "paid_leave", label: "Paid leave", on: "bg-sky-600 text-white border-sky-600", cell: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  { key: "holiday", label: "Holiday", on: "bg-violet-600 text-white border-violet-600", cell: "bg-violet-100 text-violet-800", dot: "bg-violet-500" }
];
export const STATUS_BY = Object.fromEntries(STATUS.map((s) => [s.key, s]));

const TABS = [
  { to: "/dashboard/staff", label: "Attendance", icon: CalendarCheck, end: true },
  { to: "/dashboard/staff/members", label: "Staff", icon: Users },
  { to: "/dashboard/staff/payroll", label: "Salary", icon: Wallet }
];

// Staff pages are owner-only (salaries are confidential).
export function StaffPage({ title, subtitle, actions, children }) {
  const { user } = useAuth();
  if (user?.role === "team_member") return <Navigate to="/dashboard" replace />;
  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Staff">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-navy-900 truncate">{title}</h1>
          {subtitle && <p className="text-[13px] text-navy-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">{actions}</div>
      </div>
      <nav className="mb-5 bg-white border border-navy-100/70 shadow-card rounded-2xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={!!end}
            className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap ${isActive ? "bg-navy-900 text-white" : "text-navy-500 hover:bg-navy-50"}`}>
            <Icon size={15} /> {label}
          </NavLink>
        ))}
      </nav>
      {children}
    </DashboardLayout>
  );
}