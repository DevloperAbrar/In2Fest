import React from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

// Dashboard roots only match exactly, so "Dashboard" is not highlighted on every sub page.
const EXACT_MATCH_PATHS = ["/dashboard", "/admin"];

export default function Sidebar({ items = [], logo = "In2Fest" }) {
  const { sidebarCollapsed, toggleSidebar } = useAuthStore();
  const visibleItems = useVisibleNavItems(items);
  const { t } = useTranslation();

  return (
    <aside
      className={`hidden md:flex flex-col bg-navy-900 text-navy-100 h-screen sticky top-0 transition-all duration-200 ${
        sidebarCollapsed ? "w-[76px]" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/5">
        {!sidebarCollapsed && (
          <span className="font-display font-bold text-white text-lg tracking-tight">
            {logo}
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-navy-300 hover:text-white hover:bg-white/5"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
        {visibleItems.map((item, index) => {
          // Group heading (used by the Super Admin menu)
          if (item.section) {
            return sidebarCollapsed ? (
              <div key={`section-${index}`} className="my-3 border-t border-white/10" />
            ) : (
              <p
                key={`section-${index}`}
                className="px-3 pt-4 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-navy-400"
              >
                {item.section}
              </p>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={EXACT_MATCH_PATHS.includes(item.path)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-navy-900 shadow-sm"
                    : "text-navy-300 hover:text-white hover:bg-white/5"
                } ${sidebarCollapsed ? "justify-center" : ""}`
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!sidebarCollapsed && (
                <span className="truncate">
                  {item.i18nKey ? t(item.i18nKey) : item.label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        {!sidebarCollapsed && (
          <p className="text-[11px] text-navy-400 px-1">{t("sidebar.portal")}</p>
        )}
      </div>
    </aside>
  );
}