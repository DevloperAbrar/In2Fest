import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  Menu, X, ChevronDown, MessageSquareText, LogOut, Search, Star, Bookmark,
  ArrowRight, LogIn, Building2, TrendingUp, Sparkles,
  Dumbbell, BookOpen, UtensilsCrossed, Store, HeartPulse, Scissors, GraduationCap, PartyPopper,
  LayoutDashboard, Globe, MapPin,
} from "lucide-react";
import { usePublicAuth } from "../../context/PublicAuthContext.jsx";
import MyReviewsModal from "../vendor-profile/MyReviewsModal.jsx";
import SavedVendorsModal from "../vendor-profile/SavedVendorsModal.jsx";
import { BRAND_NAME } from "../../lib/constants";
import { useTranslation } from "react-i18next";
import LanguageToggle from "../common/LanguageToggle.jsx";
import { SHOW_LANGUAGE_TOGGLE } from "../../config/features";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";
const EASE = [0.22, 1, 0.36, 1];

// Business types. Search uses keywords so it works for every city/category.
// Live business types, in launch priority order. Search uses keywords so it works for every city/category.
const BUSINESS_TYPES = [
  { key: "gym", label: "Gym, Sports & Fitness", q: "gym", icon: Dumbbell, bg: "#FFE6D6", fg: "#e8192c" },
  { key: "library", label: "Libraries & Study Rooms", q: "library", icon: BookOpen, bg: "#DDF3E8", fg: "#0f8a5f" },
  { key: "shop", label: "Shops & Retail", q: "shop", icon: Store, bg: "#FFE0E3", fg: "#e8192c" },
  { key: "food", label: "Food & Restaurants", q: "restaurant", icon: UtensilsCrossed, bg: "#FFF0C2", fg: "#d38a10" },
  { key: "events", label: "Events & Weddings", q: "event", icon: PartyPopper, bg: "#E0EAFF", fg: "#3a5bd9" },
];

// Not live yet. Shown as "Launching soon" in the menu.
const SOON_TYPES = [
  { key: "clinic", label: "Clinics", slug: "clinic", icon: HeartPulse },
  { key: "salon", label: "Salon & Spa", slug: "salon-spa", icon: Scissors },
  { key: "coaching", label: "Coaching", slug: "coaching-institute", icon: GraduationCap },
];
// Run it / Get it / Found it  (the three things the platform does)
const SOLUTIONS = [
  { to: "/for-vendors/run-it", word: "Run it.", desc: "Software for members, bookings and billing", icon: LayoutDashboard, bg: "#1a2035", fg: "#ffffff" },
  { to: "/for-vendors/get-it", word: "Get it.", desc: "Your own website on in2fest.com", icon: Globe, bg: "#e8192c", fg: "#ffffff" },
  { to: "/for-vendors/found-it", word: "Found it.", desc: "A free listing customers can find", icon: MapPin, bg: "#f5a623", fg: "#1a2035" },
];

function LogoText() {
  return (
    <span className="text-xl font-display font-extrabold" style={{ letterSpacing: "-0.02em" }}>
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

/* Small decorative arch, same motif as the logo and the home page. */
function Arches({ className = "", width = 150 }) {
  return (
    <svg className={className} width={width} height={width / 2} viewBox="0 0 220 110" aria-hidden="true">
      <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke="#f5a623" strokeWidth="18" strokeLinecap="round" />
      <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke="#e8192c" strokeWidth="18" strokeLinecap="round" />
      <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke="#1a2035" strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

const stickerRed =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-accent-500 text-white font-extrabold " +
  "shadow-[0_4px_0_0_#9e0f1b] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_#9e0f1b] " +
  "active:translate-y-1 active:shadow-[0_0_0_0_#9e0f1b]";

export default function Header() {
  const { user, logout } = usePublicAuth();
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { pathname } = useLocation();

  const [openId, setOpenId] = useState(null);       // desktop dropdown
  const [hover, setHover] = useState(null);         // hover pill
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showMyReviews, setShowMyReviews] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navRef = useRef(null);
  const userMenuRef = useRef(null);
  const closeTimer = useRef(null);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  // Sticky header gets a blur + shadow once the page moves.
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Close everything on route change.
  useEffect(() => {
    setMobileOpen(false);
    setOpenId(null);
  }, [pathname]);

  // Click outside: user menu and dropdowns.
  useEffect(() => {
    const fn = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (navRef.current && !navRef.current.contains(e.target)) setOpenId(null);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Escape closes dropdowns and the mobile drawer.
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") { setOpenId(null); setMobileOpen(false); setUserMenuOpen(false); }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  // Lock page scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const isActive = (to) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const vendorsActive = ["/for-vendors", "/get-website", "/join"].some((p) => pathname.startsWith(p));
  const categoriesActive = pathname.startsWith("/categories");

  const hoverOpen = (id) => (e) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    setOpenId(id);
  };
  const hoverClose = (e) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenId(null), 140);
  };

  const pillTransition = reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 };
  const panelMotion = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 8, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 6, scale: 0.98 },
        transition: { duration: 0.18, ease: EASE },
      };

  /* One top-level item: hover pill + active dot. */
  const itemShell = (key, active, children) => (
    <span
      className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
        active ? "text-navy-700" : "text-navy-500 hover:text-navy-700"
      }`}
      onMouseEnter={() => setHover(key)}
    >
      {hover === key && (
        <motion.span
          layoutId="nav-hover"
          className="absolute inset-0 rounded-full bg-navy-50"
          transition={pillTransition}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
      {active && <span className="absolute left-1/2 -bottom-0.5 h-1 w-5 -translate-x-1/2 rounded-full bg-gold-500" />}
    </span>
  );

  return (
    <>
      {/* Top announcement bar */}
      <div className="hidden md:flex items-center justify-center gap-2.5 text-xs font-medium py-2 px-4 text-white bg-navy-700">
        <Star size={11} className="fill-current text-gold-500" />
        <span>{t("announcement")}</span>
        <Star size={11} className="fill-current text-gold-500" />
        <a
          href={`${APP_URL}/login`}
          className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 transition px-2.5 py-0.5 text-[11px] font-bold text-gold-400"
        >
          List free <ArrowRight size={11} />
        </a>
      </div>

      {/* Main header */}
      <header
        className={`sticky top-0 z-30 transition-all duration-300 border-b ${
          scrolled
            ? "bg-white/90 backdrop-blur-md border-navy-100 shadow-[0_10px_30px_-20px_rgba(26,32,53,0.45)]"
            : "bg-white border-navy-50"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-[68px] flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 mr-2" aria-label={`${BRAND_NAME} home`}>
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav
            ref={navRef}
            aria-label="Main"
            className="hidden md:flex items-center gap-0.5"
            onMouseLeave={() => setHover(null)}
          >
            <Link to="/search" onClick={() => setOpenId(null)}>
              {itemShell("browse", isActive("/search"), t("nav.browse"))}
            </Link>

            {/* Categories mega menu */}
            <div className="relative" onPointerEnter={hoverOpen("cat")} onPointerLeave={hoverClose}>
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={openId === "cat"}
                onClick={() => setOpenId((v) => (v === "cat" ? null : "cat"))}
              >
                {itemShell(
                  "cat",
                  categoriesActive,
                  <>
                    {t("nav.categories")}
                    <ChevronDown size={14} className={`transition-transform duration-200 ${openId === "cat" ? "rotate-180" : ""}`} />
                  </>
                )}
              </button>
              <AnimatePresence>
                {openId === "cat" && (
                  <div className="absolute left-0 top-full pt-3 z-40">
                    <motion.div
                      {...panelMotion}
                      className="w-[540px] rounded-3xl bg-white border border-navy-100 p-3 shadow-[0_30px_60px_-24px_rgba(26,32,53,0.45)]"
                    >
                      <p className="px-3 pt-2 pb-2 text-[11px] font-extrabold tracking-[0.16em] uppercase text-navy-300">
                        Browse by business type
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {BUSINESS_TYPES.map((b) => {
                          const Icon = b.icon;
                          return (
                            <Link
                              key={b.key}
                              to={`/search?q=${encodeURIComponent(b.q)}`}
                              onClick={() => setOpenId(null)}
                              className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-navy-50 transition-colors"
                            >
                              <span
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
                                style={{ background: b.bg }}
                              >
                                <Icon size={19} strokeWidth={2.2} style={{ color: b.fg }} />
                              </span>
                              <span className="text-sm font-bold text-navy-700">{b.label}</span>
                              <ArrowRight size={14} className="ml-auto text-navy-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
                            </Link>
                          );
                        })}
                                            <div className="mt-2 rounded-2xl border border-dashed border-navy-100 px-3 py-2.5">
                        <p className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-navy-300 mb-2">
                          Launching soon
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {SOON_TYPES.map((s) => {
                            const SoonIcon = s.icon;
                            return (
                              <Link
                                key={s.key}
                                to={`/search?category=${s.slug}`}
                                onClick={() => setOpenId(null)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F1EC] px-3 py-1 text-xs font-bold text-navy-400 hover:text-navy-700 transition-colors"
                              >
                                <SoonIcon size={13} /> {s.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#FFF6E8] px-4 py-3">
                        <Link to="/categories" onClick={() => setOpenId(null)} className="text-sm font-extrabold text-accent-500 hover:underline">
                          View all categories
                        </Link>
                        <Link to="/cities" onClick={() => setOpenId(null)} className="text-sm font-bold text-navy-500 hover:text-navy-700">
                          All cities
                        </Link>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* For vendors: Run it / Get it / Found it */}
            <div className="relative" onPointerEnter={hoverOpen("vend")} onPointerLeave={hoverClose}>
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={openId === "vend"}
                onClick={() => setOpenId((v) => (v === "vend" ? null : "vend"))}
              >
                {itemShell(
                  "vend",
                  vendorsActive,
                  <>
                    <Building2 size={15} />
                    {t("nav.forVendors")}
                    <ChevronDown size={14} className={`transition-transform duration-200 ${openId === "vend" ? "rotate-180" : ""}`} />
                  </>
                )}
              </button>
              <AnimatePresence>
                {openId === "vend" && (
                  <div className="absolute left-0 top-full pt-3 z-40">
                    <motion.div
                      {...panelMotion}
                      className="w-[380px] rounded-3xl bg-white border border-navy-100 p-3 shadow-[0_30px_60px_-24px_rgba(26,32,53,0.45)]"
                    >
                      <p className="px-3 pt-2 pb-2 text-[11px] font-extrabold tracking-[0.16em] uppercase text-navy-300">
                        Everything your business needs
                      </p>
                      {SOLUTIONS.map((s) => {
                        const Icon = s.icon;
                        return (
                          <Link
                            key={s.to}
                            to={s.to}
                            onClick={() => setOpenId(null)}
                            className="group flex items-center gap-3.5 rounded-2xl px-3 py-3 hover:bg-navy-50 transition-colors"
                          >
                            <span
                              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
                              style={{ background: s.bg }}
                            >
                              <Icon size={20} strokeWidth={2.2} style={{ color: s.fg === "#1a2035" ? "#1a2035" : "#fff" }} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[15px] font-display font-extrabold text-navy-700">{s.word}</span>
                              <span className="block text-xs text-navy-400 mt-0.5">{s.desc}</span>
                            </span>
                            <ArrowRight size={15} className="ml-auto text-navy-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
                          </Link>
                        );
                      })}
                      <a
                        href={`${APP_URL}/login`}
                        className="mt-1 flex items-center gap-2 rounded-2xl bg-[#FFF6E8] px-4 py-3 text-sm font-bold text-navy-700 hover:text-accent-500 transition-colors"
                      >
                        <LogIn size={15} /> Already a vendor? Log in
                      </a>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2.5 ml-auto">
            {SHOW_LANGUAGE_TOGGLE && <LanguageToggle />}

            <a
              href={`${APP_URL}/login`}
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-navy-500 hover:text-navy-700 transition-colors"
            >
              <LogIn size={15} /> Vendor login
            </a>

            <Link
              to="/get-website"
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-navy-700 px-4 py-2 text-sm font-extrabold text-navy-700 hover:bg-navy-700 hover:text-white transition-colors"
            >
              <Sparkles size={14} />
              {t("nav.getWebsite")}
            </Link>

            <a href={`${APP_URL}/login`} className={`${stickerRed} px-5 py-2.5 text-sm`}>
              <TrendingUp size={14} />
              {t("nav.listBusiness")}
            </a>

            {user && (
              <>
                <div className="w-px h-6 bg-navy-100 mx-0.5" />
                <UserMenu
                  user={user}
                  menuOpen={userMenuOpen}
                  setMenuOpen={setUserMenuOpen}
                  menuRef={userMenuRef}
                  onMyReviews={() => { setShowMyReviews(true); setUserMenuOpen(false); }}
                  onSaved={() => { setShowSaved(true); setUserMenuOpen(false); }}
                  onLogout={() => { logout(); setUserMenuOpen(false); }}
                />
              </>
            )}
          </div>

          {/* Mobile: search + menu */}
          <div className="flex md:hidden items-center gap-1 ml-auto">
            <Link
              to="/search"
              aria-label="Search businesses"
              className="w-10 h-10 flex items-center justify-center rounded-full text-navy-600 hover:bg-navy-50 transition-colors"
            >
              <Search size={20} />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-navy-700 text-white hover:bg-navy-800 transition-colors"
            >
              <Menu size={19} />
            </button>
          </div>
        </div>

        {/* Scroll progress */}
        {!reduce && (
          <motion.span
            aria-hidden="true"
            style={{ scaleX: progress, opacity: scrolled ? 1 : 0 }}
            className="absolute left-0 bottom-0 h-[3px] w-full origin-left bg-gradient-to-r from-gold-500 via-accent-500 to-navy-700 transition-opacity duration-300"
          />
        )}
      </header>

      {/* Mobile drawer (outside <header> so backdrop-blur does not trap it) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            <div className="absolute inset-0 bg-navy-800/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="absolute right-0 top-0 h-full w-[90%] max-w-sm bg-[#FFF6E8] flex flex-col shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: reduce ? 0 : 0.38, ease: EASE }}
            >
              <div className="flex items-center justify-between px-5 h-[68px] flex-shrink-0">
                <Link to="/" onClick={() => setMobileOpen(false)}><Logo /></Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-navy-700 shadow-sm"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-6">
                <MItem i={0} reduce={reduce}>
                  <div className="grid gap-2.5">
                    <a href={`${APP_URL}/login`} className={`${stickerRed} w-full py-3.5 text-sm`}>
                      <TrendingUp size={15} /> {t("nav.listBusiness")}
                    </a>
                    <Link
                      to="/get-website"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-navy-700 bg-white w-full py-3 text-sm font-extrabold text-navy-700"
                    >
                      <Sparkles size={15} /> {t("nav.getWebsite")}
                    </Link>
                  </div>
                </MItem>

                <MItem i={1} reduce={reduce}>
                  <p className="mt-7 mb-3 text-[11px] font-extrabold tracking-[0.16em] uppercase text-navy-400">Browse by type</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {BUSINESS_TYPES.map((b) => {
                      const Icon = b.icon;
                      return (
                        <Link
                          key={b.key}
                          to={`/search?q=${encodeURIComponent(b.q)}`}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2.5 rounded-2xl px-3 py-3 active:scale-[0.97] transition"
                          style={{ background: b.bg }}
                        >
                          <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                            <Icon size={16} strokeWidth={2.3} style={{ color: b.fg }} />
                          </span>
                          <span className="text-[13px] font-extrabold text-navy-700 leading-tight">{b.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </MItem>

                <MItem i={2} reduce={reduce}>
                  <p className="mt-7 mb-2 text-[11px] font-extrabold tracking-[0.16em] uppercase text-navy-400">For vendors</p>
                  <div className="rounded-3xl bg-white p-1.5">
                    {SOLUTIONS.map((s) => {
                      const Icon = s.icon;
                      return (
                        <Link
                          key={s.to}
                          to={s.to}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-2xl px-3 py-3 active:bg-navy-50"
                        >
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                            <Icon size={18} strokeWidth={2.2} style={{ color: s.fg === "#1a2035" ? "#1a2035" : "#fff" }} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-display font-extrabold text-navy-700">{s.word}</span>
                            <span className="block text-xs text-navy-400">{s.desc}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </MItem>

                <MItem i={3} reduce={reduce}>
                  <div className="mt-5 grid gap-1">
                    {[
                      ["/search", t("nav.browse")],
                      ["/categories", "All categories"],
                      ["/cities", "All cities"],
                      ["/about", "About us"],
                      ["/contact", "Contact us"],
                    ].map(([to, label]) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-semibold text-navy-600 active:bg-white"
                      >
                        {label} <ArrowRight size={15} className="text-navy-300" />
                      </Link>
                    ))}
                    <a href={`${APP_URL}/login`} className="flex items-center gap-2 rounded-xl px-3 py-3 text-[15px] font-semibold text-navy-600 active:bg-white">
                      <LogIn size={16} /> Vendor login
                    </a>
                  </div>
                </MItem>

                {(SHOW_LANGUAGE_TOGGLE || user) && (
                  <MItem i={4} reduce={reduce}>
                    <div className="mt-4 pt-4 border-t border-navy-100 space-y-1">
                      {SHOW_LANGUAGE_TOGGLE && <LanguageToggle variant="mobile" />}
                      {user && (
                        <>
                          <div className="flex items-center gap-2.5 px-3 py-2">
                            <span className="w-9 h-9 rounded-full bg-navy-700 text-white text-xs font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
                              {user.avatar_url
                                ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                : user.name?.[0]?.toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-navy-700 truncate">{user.name}</p>
                              <p className="text-xs text-navy-400 truncate">{user.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => { setShowMyReviews(true); setMobileOpen(false); }}
                            className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-navy-600 active:bg-white flex items-center gap-2"
                          >
                            <MessageSquareText size={15} className="text-navy-300" /> {t("nav.myReviews")}
                          </button>
                          <button
                            onClick={() => { setShowSaved(true); setMobileOpen(false); }}
                            className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-navy-600 active:bg-white flex items-center gap-2"
                          >
                            <Bookmark size={15} className="text-navy-300" /> Saved Vendors
                          </button>
                          <button
                            onClick={() => { logout(); setMobileOpen(false); }}
                            className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-accent-600 active:bg-accent-50 flex items-center gap-2"
                          >
                            <LogOut size={15} /> {t("nav.signOut")}
                          </button>
                        </>
                      )}
                    </div>
                  </MItem>
                )}
              </div>

              <div className="relative flex-shrink-0 overflow-hidden bg-navy-700 px-5 py-4">
                <Arches className="absolute -right-6 -bottom-4 opacity-90" width={120} />
                <p className="relative font-display font-extrabold text-white text-lg" style={{ letterSpacing: "-0.02em" }}>
                  Run it. <span className="text-gold-500">Get it.</span> Found it.
                </p>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {showMyReviews && <MyReviewsModal onClose={() => setShowMyReviews(false)} />}
      {showSaved && <SavedVendorsModal onClose={() => setShowSaved(false)} />}
    </>
  );
}

/* Staggered entrance for drawer sections. */
function MItem({ i, reduce, children }) {
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 + i * 0.06, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function UserMenu({ user, menuOpen, setMenuOpen, menuRef, onMyReviews, onSaved, onLogout }) {
  const { t } = useTranslation();
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border-2 border-navy-100 hover:border-navy-300 bg-white transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-navy-700 text-white text-xs font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
          {user.avatar_url
            ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            : user.name?.[0]?.toUpperCase()}
        </span>
        <span className="text-sm font-semibold text-navy-700 max-w-[90px] truncate">{user.name}</span>
        <ChevronDown size={13} className={`text-navy-300 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-[0_30px_60px_-24px_rgba(26,32,53,0.45)] border border-navy-100 py-2 z-40"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-navy-50">
              <span className="w-9 h-9 rounded-full bg-navy-700 text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  : user.name?.[0]?.toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-navy-700 truncate">{user.name}</p>
                <p className="text-xs text-navy-400 truncate">{user.email}</p>
              </div>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-2 text-xs text-navy-400 border-b border-navy-50">
              <MessageSquareText size={13} className="text-accent-500" />
              {user.review_count} review{user.review_count === 1 ? "" : "s"} submitted
            </div>
            <div className="pt-1">
              <button
                onClick={onMyReviews}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm text-navy-600 hover:bg-navy-50 transition-colors"
              >
                <MessageSquareText size={15} className="text-navy-300" /> {t("nav.myReviews")}
              </button>
              <button
                onClick={onSaved}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm text-navy-600 hover:bg-navy-50 transition-colors"
              >
                <Bookmark size={15} className="text-navy-300" /> Saved Vendors
              </button>
            </div>
            <div className="border-t border-navy-50 mt-1 pt-1">
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm text-accent-600 hover:bg-accent-50 transition-colors"
              >
                <LogOut size={15} /> {t("nav.signOut")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}