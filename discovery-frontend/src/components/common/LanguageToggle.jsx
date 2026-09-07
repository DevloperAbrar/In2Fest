import React from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export default function LanguageToggle({ variant = "default" }) {
  const { i18n, t } = useTranslation();
  const isHindi = i18n.language === "hi";

  const toggle = () => {
    const next = isHindi ? "en" : "hi";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  };

  if (variant === "mobile") {
    return (
      <button
        onClick={toggle}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Languages size={15} className="text-gray-400" />
        {t("common.switchLang")}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
    >
      <Languages size={14} />
      {isHindi ? "EN" : "हि"}
    </button>
  );
}