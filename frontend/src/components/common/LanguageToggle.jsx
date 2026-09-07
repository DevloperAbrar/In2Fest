import React from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const isHindi = i18n.language === "hi";

  const toggle = () => {
    const next = isHindi ? "en" : "hi";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-navy-600 text-xs font-semibold text-navy-300 hover:text-white hover:border-white/30 hover:bg-white/5 transition-colors"
    >
      <Languages size={13} />
      {isHindi ? "EN" : "हि"}
    </button>
  );
}