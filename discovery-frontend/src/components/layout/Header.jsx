import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu, X, ChevronDown, MessageSquareText,
  Building2, LogOut, BadgeCheck, Search,
  Sparkles, TrendingUp, Star
} from "lucide-react";
import { usePublicAuth } from "../../context/PublicAuthContext.jsx";
import MyReviewsModal from "../vendor-profile/MyReviewsModal.jsx";
import { BRAND_NAME } from "../../lib/constants";
import { useTranslation } from "react-i18next";
import LanguageToggle from "../common/LanguageToggle.jsx";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

function LogoText({ size = "normal" }) {
  const cls = size === "large"
    ? "text-2xl font-display font-extrabold"
    : "text-xl font-display font-extrabold";
  return (
    <span className={cls} style={{ letterSpacing: "-0.02em" }}>
      <span style={{ color: "#1a2035" }}>In</span>
      <span style={{ color: "#e8192c" }}>2</span>
      <span style={{ color: "#1a2035" }}>Fest</span>
    </span>
  );
}

let logoSrc = null;
try { logoSrc = new URL("../../assets/logo.png", import.meta.url).href; } catch {}

function Logo() {
  const [imgFailed, setImgFailed] = useState(false);
  if (!logoSrc || imgFailed) return <LogoText />;
  return (
    <img
      src={logoSrc}
      alt={BRAND_NAME}
      className="h-8 w-auto object-contain"
      onError={() => setImgFailed(true)}
    />
  );
}

export default function Header() {
  const { user, vendorSession, logout } = usePublicAuth();
  const { t } = useTranslation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [showMyReviews, setShowMyReviews] = useState(false);
  const userMenuRef = useRef(null);
  const { pathname }  = useLocation();

  useEffect(() => {
    const fn = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (to) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const NAV_LINKS = [
    { to: "/search",      label: t("nav.browse") },
    { to: "/categories",  label: t("nav.categories") },
    { to: "/for-vendors", label: t("nav.forVendors"), icon: Building2, highlight: true },
  ];

  return (
    <>
      {/* ── Top announcement bar ── */}
      <div
        className="hidden md:flex items-center justify-center gap-2 text-xs font-medium py-1.5 px-4 text-white"
        style={{ background: "#1a2035" }}
      >
        <Star size={11} style={{ color: "#f5a623" }} className="fill-current" />
        {t("announcement")}
        <Star size={11} style={{ color: "#f5a623" }} className="fill-current" />
      </div>

      {/* ── Main header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <Logo />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 mx-4">
            {NAV_LINKS.map(({ to, label, icon: Icon, highlight }) => (
              <Link
                key={to}
                to={to}
                className={[
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(to)
                    ? highlight
                      ? "text-gold-600 bg-gold-50"
                      : "text-primary-700 bg-primary-50"
                    : highlight
                      ? "text-navy-700 bg-navy-50 hover:bg-navy-100"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                ].join(" ")}
              >
                {Icon && <Icon size={14} />}
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop Right - highlighted actions */}
          <div className="hidden md:flex items-center gap-2 ml-auto">

            {/* Language Toggle */}
            <LanguageToggle />

            {/* ── List Your Business → vendor login/signup ── */}
            <a href={`${APP_URL}/login`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-colors"
              style={{ borderColor: "#e8192c", color: "#e8192c" }}
            >
              <TrendingUp size={14} />
              {t("nav.listBusiness")}
            </a>

            {/* ── Get Your Website ── */}
            <Link
              to="/get-website"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
            >
              <Sparkles size={13} />
              {t("nav.getWebsite")}
            </Link>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {user ? (
              <UserMenu
                user={user}
                menuOpen={userMenuOpen}
                setMenuOpen={setUserMenuOpen}
                menuRef={userMenuRef}
                onMyReviews={() => { setShowMyReviews(true); setUserMenuOpen(false); }}
                onLogout={() => { logout(); setUserMenuOpen(false); }}
              />
            ) : vendorSession ? (
              <a href={APP_URL}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors"
              >
                <BadgeCheck size={14} /> {vendorSession.name}
              </a>
            ) : null}
          </div>

          {/* Mobile: search icon + hamburger */}
          <div className="flex md:hidden items-center gap-1 ml-auto">
            <Link
              to="/search"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Search size={19} />
            </Link>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown panel ── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-5 space-y-1 shadow-lg">
            {NAV_LINKS.map(({ to, label, icon: Icon, highlight }) => (
              <Link
                key={to}
                to={to}
                className={[
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive(to)
                    ? highlight
                      ? "text-gold-600 bg-gold-50"
                      : "text-primary-700 bg-primary-50"
                    : highlight
                      ? "text-navy-700 bg-navy-50"
                      : "text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {Icon && <Icon size={15} />}
                {label}
              </Link>
            ))}

            <div className="pt-3 border-t border-gray-100 space-y-2 mt-1">
              {/* Language toggle in mobile */}
              <LanguageToggle variant="mobile" />

              <a href={`${APP_URL}/login`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: "#e8192c" }}
              >
                <TrendingUp size={14} />
                {t("nav.listBusiness")}
              </a>
              <Link
                to="/get-website"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
              >
                <Sparkles size={14} />
                {t("nav.getWebsite")}
              </Link>

              {user && (
                <>
                  <div className="flex items-center gap-2.5 px-3 py-2">
                    <span className="w-8 h-8 rounded-full bg-primary-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {user.name?.[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowMyReviews(true); setMobileOpen(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <MessageSquareText size={15} className="text-gray-400" /> {t("nav.myReviews")}
                  </button>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut size={15} /> {t("nav.signOut")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {showMyReviews && <MyReviewsModal onClose={() => setShowMyReviews(false)} />}
    </>
  );
}

function UserMenu({ user, menuOpen, setMenuOpen, menuRef, onMyReviews, onLogout }) {
  const { t } = useTranslation();
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-gray-200 hover:border-primary-300 bg-white transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-primary-700 text-white text-xs font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
          {user.avatar_url
            ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            : user.name?.[0]?.toUpperCase()}
        </span>
        <span className="text-sm font-medium text-gray-700 max-w-[90px] truncate">{user.name}</span>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-40">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
            <span className="w-9 h-9 rounded-full bg-primary-700 text-white font-bold flex items-center justify-center flex-shrink-0">
              {user.name?.[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <div className="px-4 py-2.5 flex items-center gap-2 text-xs text-gray-500 border-b border-gray-50">
            <MessageSquareText size={13} style={{ color: "#e8192c" }} />
            {user.review_count} review{user.review_count === 1 ? "" : "s"} submitted
          </div>
          <div className="pt-1">
            <button
              onClick={onMyReviews}
              className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <MessageSquareText size={15} className="text-gray-400" /> {t("nav.myReviews")}
            </button>
            <Link
              to="/for-vendors"
              className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Building2 size={15} className="text-gray-400" /> {t("nav.listBusiness")}
            </Link>
          </div>
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} /> {t("nav.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}