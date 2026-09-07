import React, { useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageToggle from "../common//LanguageToggle";

export default function Navbar({ title }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-14 md:h-16 bg-white/90 backdrop-blur border-b border-navy-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <h1 className="font-display font-semibold text-navy-900 text-[15px] md:text-base truncate pr-3">
        {title}
      </h1>

      <div className="flex items-center gap-2 shrink-0">
        <LanguageToggle />

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="tap-scale flex items-center gap-2 text-sm text-navy-700 hover:bg-navy-50 pl-1.5 pr-2.5 py-1.5 rounded-full"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <span className="hidden md:inline max-w-[120px] truncate">{user?.name}</span>
            <ChevronDown size={14} className="hidden md:inline text-navy-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-44 bg-white border border-navy-100 rounded-xl shadow-card py-1 z-20">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50"
                >
                  <LogOut size={14} /> {t("navbar.logout")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}