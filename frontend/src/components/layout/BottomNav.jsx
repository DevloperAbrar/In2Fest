import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { ownerSidebarItems } from "../../features/venue-owner/ownerSidebarItems.js";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";
import MoreMenuSheet from "./MoreMenuSheet.jsx";
import { useTranslation } from "react-i18next";

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleItems = useVisibleNavItems(ownerSidebarItems);
  const { t } = useTranslation();

  const primaryItems = visibleItems.filter((i) => i.primaryNav);
  const moreItems = visibleItems.filter((i) => !i.primaryNav);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-navy-100 shadow-nav
                   pb-safe-b"
      >
        <div className="grid grid-cols-5 h-16">
          {primaryItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              className="tap-scale flex flex-col items-center justify-center gap-1"
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.4 : 2}
                    className={isActive ? "text-primary-600" : "text-navy-400"}
                  />
                  <span
                    className={`text-[10.5px] font-medium ${
                      isActive ? "text-primary-600" : "text-navy-400"
                    }`}
                  >
                    {item.i18nKey ? t(item.i18nKey) : item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          <button
            onClick={() => setMoreOpen(true)}
            className="tap-scale flex flex-col items-center justify-center gap-1"
          >
            <MoreHorizontal size={20} className="text-navy-400" />
            <span className="text-[10.5px] font-medium text-navy-400">{t("bottomNav.more")}</span>
          </button>
        </div>
      </nav>

      <MoreMenuSheet open={moreOpen} onClose={() => setMoreOpen(false)} items={moreItems} />

      <div className="md:hidden h-[calc(4rem+env(safe-area-inset-bottom))]" />
    </>
  );
}