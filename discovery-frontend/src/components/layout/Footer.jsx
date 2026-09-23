import React from "react";
import { Link } from "react-router-dom";
import { BRAND_NAME, CATEGORIES } from "../../lib/constants";
import { useTranslation } from "react-i18next";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

const SOCIAL_LINKS = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/in2fest/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/in2fest/",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9v-2.89h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@in2fest",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.5V8.5L15.8 12z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/in2fest",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.11 20.45H3.56V9h3.55v11.45z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const { t } = useTranslation();
  const topCategories = CATEGORIES.slice(0, 10);

  return (
    <footer className="border-t border-gray-100 bg-gray-50 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
        <div>
          <Link to="/" className="text-lg font-display font-bold text-navy-900">
            In<span className="text-primary-600">2</span>Fest
          </Link>
          <p className="text-gray-500 mt-2 text-xs leading-relaxed">
            {t("footer.tagline")}
          </p>

          <div className="flex items-center gap-3 mt-4">
            {SOCIAL_LINKS.map((social) => (
              
             <a   key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className="text-gray-400 hover:text-primary-600 transition-colors"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-700 mb-3">{t("footer.popularCategories")}</p>
          <ul className="space-y-2">
            {topCategories.map((cat) => (
              <li key={cat.slug}>
                <Link to={`/search?category=${cat.slug}`} className="text-gray-500 hover:text-primary-600 text-xs">
                  {cat.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/categories" className="text-primary-600 hover:text-primary-700 text-xs font-medium">
                {t("footer.viewAllCategories")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-gray-700 mb-3">{t("footer.company")}</p>
          <ul className="space-y-2">
            <li><Link to="/search" className="text-gray-500 hover:text-primary-600 text-xs">{t("footer.browseVendors")}</Link></li>
            <li><Link to="/cities" className="text-gray-500 hover:text-primary-600 text-xs">{t("footer.allCities")}</Link></li>
            <li><Link to="/for-vendors" className="text-gray-500 hover:text-primary-600 text-xs">{t("footer.forVendors")}</Link></li>
            <li><a href={`${APP_URL}/login`} className="text-gray-500 hover:text-primary-600 text-xs">{t("footer.listBusiness")}</a></li>
            <li><Link to="/about" className="text-gray-500 hover:text-primary-600 text-xs">{t("footer.aboutUs")}</Link></li>
            <li><Link to="/contact" className="text-gray-500 hover:text-primary-600 text-xs">{t("footer.contactUs")}</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-gray-700 mb-3">{t("footer.legal")}</p>
          <ul className="space-y-2">
            <li><Link to="/privacy" className="text-gray-500 hover:text-primary-600 text-xs">{t("footer.privacyPolicy")}</Link></li>
            <li><Link to="/terms" className="text-gray-500 hover:text-primary-600 text-xs">{t("footer.termsOfService")}</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-gray-700 mb-3">{t("footer.alsoSearched")}</p>
          <p className="text-gray-400 text-xs leading-relaxed">
            {t("footer.alsoSearchedValues")}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-5 text-xs text-gray-400 flex flex-col gap-1">
          <p>
            © {new Date().getFullYear()}{" "}
            <a href="https://campussafar.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-600 transition-colors"
            >
              Campussafar Technologies Private Limited®
            </a>
            . {t("footer.rights")}
          </p>
          <p className="text-gray-400">
            {BRAND_NAME}™ {t("footer.trademark")}
          </p>
        </div>
      </div>
    </footer>
  );
}