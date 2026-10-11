import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import KpiCard from "../../../components/common/KpiCard";
import Loader from "../../../components/common/Loader";
import { adminSidebarItems } from "../adminSidebarItems.js";

/** Standard shell for the Super Admin overview pages: layout + loading + error state. */
export function AdminPage({ title, loading, error, onRetry, action, children }) {
  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle={title}>
      {action && <div className="flex justify-end mb-4">{action}</div>}
      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorPanel message={error} onRetry={onRetry} />
      ) : (
        children
      )}
    </DashboardLayout>
  );
}

export function ErrorPanel({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
      <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-700">Could not load this page</p>
        <p className="text-xs text-red-600 mt-0.5 break-words">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-semibold text-red-700 hover:underline flex-shrink-0">
          Try again
        </button>
      )}
    </div>
  );
}

export function RefreshButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 text-xs font-medium text-navy-600 bg-white border border-navy-100 hover:bg-navy-50 disabled:opacity-60 px-3 py-2 rounded-xl"
    >
      <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
    </button>
  );
}

export function Section({ title, hint, children }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="font-display font-semibold text-navy-800 text-[15px]">{title}</h2>
        {hint && <p className="text-xs text-navy-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Grid of KpiCards. An item with `to` becomes a link to the page that manages that number. */
export function KpiGrid({ items, cols = 4 }) {
  const colClass = cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 ${colClass} gap-4`}>
      {items.map(({ to, ...card }) =>
        to ? (
          <Link key={card.label} to={to} className="block hover:-translate-y-0.5 transition-transform">
            <KpiCard {...card} />
          </Link>
        ) : (
          <KpiCard key={card.label} {...card} />
        )
      )}
    </div>
  );
}

export function EmptyLine({ children }) {
  return <p className="text-sm text-gray-400 text-center py-8">{children}</p>;
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(seconds) {
  const s = Number(seconds) || 0;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const formatNumber = (n) => new Intl.NumberFormat("en-IN").format(Number(n) || 0);

/** Horizontal bar list: [{ label, count }] */
export function BarList({ rows = [], color = "#7c3aed", emptyText = "No data yet" }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  if (rows.length === 0) return <EmptyLine>{emptyText}</EmptyLine>;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs text-gray-500 mb-1 gap-2">
            <span className="capitalize truncate">{String(r.label).replace(/[-_]/g, " ")}</span>
            <span className="font-semibold text-gray-900 flex-shrink-0">{formatNumber(r.count)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}