import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { Building2, CreditCard, Receipt, Users, Crown, ChevronRight } from "lucide-react";

const SETTINGS_LINKS = [
  { to: "/dashboard/settings/profile", i18nKey: "settings.links.profile", icon: Building2 },
  { to: "/dashboard/settings/payment", i18nKey: "settings.links.payment", icon: CreditCard },
  { to: "/dashboard/settings/gst", i18nKey: "settings.links.gst", icon: Receipt },
  { to: "/dashboard/settings/team", i18nKey: "settings.links.team", icon: Users },
  { to: "/dashboard/settings/subscription", i18nKey: "settings.links.subscription", icon: Crown }
];

export default function SettingsIndex() {
  const { t } = useTranslation();

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={t("settings.pageTitle")}>
      <div className="max-w-2xl bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
        {SETTINGS_LINKS.map(({ to, i18nKey, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <Icon size={18} className="text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{t(`${i18nKey}.label`)}</p>
              <p className="text-xs text-gray-400">{t(`${i18nKey}.desc`)}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}