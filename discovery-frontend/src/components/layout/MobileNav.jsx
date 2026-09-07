import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusCircle, Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageToggle from "../common/LanguageToggle.jsx";

export default function MobileNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (to) => {
    if (to === "/") return pathname === "/";
    return pathname.startsWith(to);
  };

  const NAV_ITEMS = [
    { to: "/",              icon: Home,       label: t("mobileNav.home") },
    { to: "/search",        icon: Search,     label: t("mobileNav.search") },
    { to: "/register-free", icon: PlusCircle, label: t("mobileNav.listFree") },
  ];

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-pb">
        <div className="grid grid-cols-4 h-16">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={[
                "flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                isActive(to)
                  ? "text-primary-600"
                  : "text-gray-400 hover:text-gray-700",
              ].join(" ")}
            >
              <Icon
                size={20}
                className={isActive(to) ? "text-primary-600" : "text-gray-400"}
                strokeWidth={isActive(to) ? 2.5 : 1.8}
              />
              {label}
            </Link>
          ))}

          {/* More button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Menu size={20} strokeWidth={1.8} />
            {t("mobileNav.more")}
          </button>
        </div>
      </nav>

      {/* Bottom padding so page content doesn't hide behind nav */}
      <div className="md:hidden h-16" aria-hidden="true" />

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="font-semibold text-gray-800">{t("nav.menu")}</span>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1">
              <DrawerLink to="/" label={t("mobileNav.homeLink")} onClick={() => setDrawerOpen(false)} />
              <DrawerLink to="/search" label={t("mobileNav.searchVendors")} onClick={() => setDrawerOpen(false)} />
              <DrawerLink to="/categories" label={t("mobileNav.allCategories")} onClick={() => setDrawerOpen(false)} />
              <DrawerLink to="/cities" label={t("mobileNav.allCities")} onClick={() => setDrawerOpen(false)} />
              <DrawerLink to="/for-vendors" label={t("mobileNav.forVendors")} onClick={() => setDrawerOpen(false)} />
              <DrawerLink to="/register-free" label={t("mobileNav.listBusinessFree")} onClick={() => setDrawerOpen(false)} />
              {/* Language toggle inside drawer */}
              <div className="px-3 pt-1">
                <LanguageToggle variant="mobile" />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
              {t("mobileNav.tagline")}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DrawerLink({ to, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {label}
    </Link>
  );
}