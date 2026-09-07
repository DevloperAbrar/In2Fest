import React from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function MoreMenuSheet({ open, onClose, items = [] }) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-navy-900/40" onClick={onClose} />

      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl pb-safe-b animate-slot-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-9" />
          <div className="w-10 h-1 rounded-full bg-navy-200" />
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-navy-400">
            <X size={18} />
          </button>
        </div>

        <p className="px-5 pb-2 text-xs font-semibold text-navy-400 uppercase tracking-wide">
          {t("bottomNav.more")}
        </p>

        <div className="grid grid-cols-3 gap-3 px-5 pb-6">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className="tap-scale flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-paper border border-navy-100"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <item.icon size={19} className="text-primary-600" />
              </div>
              <span className="text-[11.5px] font-medium text-navy-700 text-center leading-tight">
                {item.i18nKey ? t(item.i18nKey) : item.label}
              </span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}