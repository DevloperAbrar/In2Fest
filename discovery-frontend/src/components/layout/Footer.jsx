import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUp } from "lucide-react";
import { BRAND_NAME } from "../../lib/constants";
import { useTranslation } from "react-i18next";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";
const EASE = [0.22, 1, 0.36, 1];

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

// Generic business types, same keyword search as the home page tiles.
// Live business types only, in launch priority order.
const BROWSE = [
  ["Gyms, sports & fitness", "gym"],
  ["Libraries & study rooms", "library"],
  ["Shops & retail", "shop"],
  ["Restaurants & food", "restaurant"],
  ["Event venues & vendors", "event"],
];

function Arches({ className = "", width = 260 }) {
  return (
    <svg className={className} width={width} height={width / 2} viewBox="0 0 220 110" aria-hidden="true">
      <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke="#f5a623" strokeWidth="18" strokeLinecap="round" />
      <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke="#e8192c" strokeWidth="18" strokeLinecap="round" />
      <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

function FooterLink({ to, href, children }) {
  const cls =
    "group inline-flex items-center gap-1.5 text-sm text-white/65 hover:text-white transition-colors";
  const arrow = (
    <ArrowRight
      size={13}
      className="text-gold-500 opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200"
    />
  );
  if (href) return <a href={href} className={cls}>{children}{arrow}</a>;
  return <Link to={to} className={cls}>{children}{arrow}</Link>;
}

function Column({ title, children }) {
  return (
    <div>
      <p className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-gold-500 mb-4">{title}</p>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}

export default function Footer() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const isHome = pathname === "/";

  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-40px" },
        transition: { duration: 0.6, ease: EASE },
      };

  const toTop = () => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });

  return (
    <footer className={`relative bg-navy-800 text-white overflow-hidden ${isHome ? "" : "mt-16"}`}>
      {/* brand stripe */}
      <div className="flex h-1.5" aria-hidden="true">
        <span className="flex-1 bg-gold-500" />
        <span className="flex-1 bg-accent-500" />
        <span className="flex-1 bg-white" />
      </div>

      {/* Vendor CTA band (the home page already ends with its own CTA) */}
      {!isHome && (
        <div className="max-w-7xl mx-auto px-4 pt-14">
          <motion.div
            {...reveal}
            className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-accent-500 px-7 py-9 md:px-12 md:py-11"
          >
            <Arches className="absolute -right-10 -bottom-6 opacity-30 hidden sm:block" width={300} />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-xs font-extrabold tracking-[0.18em] uppercase text-white/80">Own a local business?</p>
                <h2
                  className="mt-2 font-display font-extrabold text-white"
                  style={{ fontSize: "clamp(1.7rem, 4vw, 2.8rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}
                >
                  Run it. <span className="text-navy-700">Get it.</span> Found it.
                </h2>
                <p className="mt-3 text-white/85 text-sm md:text-base max-w-lg">
                  Software, your own website and customers who find you, all in one place. Free to start.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <a
                  href={`${APP_URL}/login`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-700 hover:bg-navy-800 transition px-7 py-3.5 text-sm font-extrabold text-white shadow-[0_5px_0_0_#0b0e1c] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none"
                >
                  Start free <ArrowRight size={15} />
                </a>
                <Link
                  to="/get-website"
                  className="inline-flex items-center justify-center rounded-full border-2 border-white/70 hover:bg-white hover:text-accent-600 transition px-7 py-3.5 text-sm font-extrabold text-white"
                >
                  See the website you get
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main grid */}
      <div className="relative max-w-7xl mx-auto px-4 pt-14 md:pt-16 pb-10">
        <motion.div {...reveal} className="grid grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-x-6 gap-y-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 max-w-sm">
            <Link to="/" className="inline-block text-3xl font-display font-extrabold" style={{ letterSpacing: "-0.03em" }} aria-label={`${BRAND_NAME} home`}>
              <span className="text-white">In</span>
              <span className="text-accent-500">2</span>
              <span className="text-white">Fest</span>
            </Link>
            <p className="mt-4 text-sm text-white/65 leading-relaxed">
              {t(
                "footer.brandLine",
                "Software to run your business, a website of your own, and customers who find you. For gyms, libraries, restaurants, shops, clinics, events and more."
              )}
            </p>
            <div className="flex items-center gap-2.5 mt-6">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="w-10 h-10 rounded-full bg-white/10 text-white/80 flex items-center justify-center transition duration-200 hover:bg-gold-500 hover:text-navy-700 hover:-translate-y-1"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <Column title="For businesses">
            <li><FooterLink to="/for-vendors">Run it · Business software</FooterLink></li>
            <li><FooterLink to="/get-website">Get it · Your website</FooterLink></li>
            <li><FooterLink to="/join">Found it · Free listing</FooterLink></li>
            <li><FooterLink href={`${APP_URL}/login`}>{t("footer.listBusiness")}</FooterLink></li>
            <li><FooterLink href={`${APP_URL}/login`}>Vendor login</FooterLink></li>
          </Column>

          <Column title="Find a business">
            {BROWSE.map(([label, q]) => (
              <li key={q}><FooterLink to={`/search?q=${encodeURIComponent(q)}`}>{label}</FooterLink></li>
            ))}
            <li>
              <Link to="/categories" className="inline-flex items-center gap-1.5 text-sm font-bold text-gold-400 hover:text-gold-500 transition-colors">
                {t("footer.viewAllCategories")} <ArrowRight size={13} />
              </Link>
            </li>
          </Column>

          <Column title={t("footer.company")}>
            <li><FooterLink to="/search">{t("footer.browseVendors")}</FooterLink></li>
            <li><FooterLink to="/cities">{t("footer.allCities")}</FooterLink></li>
            <li><FooterLink to="/about">{t("footer.aboutUs")}</FooterLink></li>
            <li><FooterLink to="/contact">{t("footer.contactUs")}</FooterLink></li>
            <li><FooterLink to="/privacy">{t("footer.privacyPolicy")}</FooterLink></li>
            <li><FooterLink to="/terms">{t("footer.termsOfService")}</FooterLink></li>
          </Column>
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4 text-xs text-white/50">
          <div className="space-y-1.5">
            <p>
              © {new Date().getFullYear()}{" "}
              <a
                href="https://campussafar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold-500 transition-colors"
              >
                Campussafar Technologies Private Limited®
              </a>
              . {t("footer.rights")}
            </p>
            <p>{BRAND_NAME}™ {t("footer.trademark")}</p>
            <p className="text-white/35">
              {t("footer.alsoSearched")}: {t("footer.alsoSearchedValues")}
            </p>
          </div>
          <button
            type="button"
            onClick={toTop}
            className="group self-start md:self-auto inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-gold-500 hover:text-gold-500 transition px-4 py-2 text-xs font-bold text-white/80"
          >
            Back to top
            <ArrowUp size={14} className="transition-transform group-hover:-translate-y-0.5" />
          </button>
        </div>

        {/* giant faint wordmark */}
        <div
          aria-hidden="true"
          className="select-none overflow-hidden text-center font-display font-extrabold leading-[0.78] text-white/[0.04] -mb-[0.12em]"
          style={{ fontSize: "clamp(5rem, 21vw, 19rem)", letterSpacing: "-0.05em" }}
        >
          In2Fest
        </div>
      </div>
    </footer>
  );
}