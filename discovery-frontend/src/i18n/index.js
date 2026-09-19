import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import { SHOW_LANGUAGE_TOGGLE } from "../config/features";

// While the language toggle is hidden, always start in English so nobody is
// stuck in a previously-saved language with no way to switch back.
// The saved "lang" value is left untouched and is used again as soon as
// SHOW_LANGUAGE_TOGGLE is set back to true.
const savedLang = SHOW_LANGUAGE_TOGGLE ? localStorage.getItem("lang") : null;

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, hi: { translation: hi } },
    lng: savedLang || "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;