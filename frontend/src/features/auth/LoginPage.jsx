import React, { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Dumbbell,
  BookOpen,
  UtensilsCrossed,
  Store,
  HeartPulse,
  PartyPopper,
  MessageCircle,
  IndianRupee,
  ShieldCheck,
  Check,
  LayoutDashboard,
  Globe2,
  MapPin,
  Star,
} from "lucide-react";
import GoogleLoginButton from "./GoogleLoginButton.jsx";
import { showError } from "../../components/common/Toast";
import logo from "../../assets/logo.png";
import InstallLink from "../install/InstallLink.jsx";

const EASE = [0.22, 1, 0.36, 1];
const NAVY = "#1a2035";
const RED = "#e8192c";
const GOLD = "#f5a623";
const CREAM = "#FFF6E8";

// Same business types as the public site, so the look works for every category.
const TILES = [
  { key: "gym", label: "Gyms", icon: Dumbbell, bg: "#FFE6D6", ink: "#e8192c" },
  { key: "library", label: "Library", icon: BookOpen, bg: "#DDF3E8", ink: "#0f8a5f" },
  { key: "food", label: "Restaurants", icon: UtensilsCrossed, bg: "#FFF0C2", ink: "#d38a10" },
  { key: "shop", label: "Shops", icon: Store, bg: "#FFE0E3", ink: "#e8192c" },
  { key: "clinic", label: "Clinics", icon: HeartPulse, bg: "#E0EAFF", ink: "#3a5bd9" },
  { key: "events", label: "Events", icon: PartyPopper, bg: "#FFF0C2", ink: "#d38a10" },
];

const FEATURES = [
  { icon: LayoutDashboard, label: "Business dashboard" },
  { icon: Globe2, label: "Your own website" },
  { icon: MapPin, label: "Free listing" },
  { icon: MessageCircle, label: "WhatsApp enquiries" },
  { icon: Star, label: "Reviews" },
];

const TRUST = ["Free to start", "No commission", "Secure Google sign-in"];

/* The arch from the In2Fest logo, used as a brand motif. */
function Arches({ className = "", width = 220, colors = [GOLD, RED, "#ffffff"] }) {
  return (
    <svg className={className} width={width} height={width / 2} viewBox="0 0 220 110" aria-hidden="true">
      <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke={colors[0]} strokeWidth="18" strokeLinecap="round" />
      <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke={colors[1]} strokeWidth="18" strokeLinecap="round" />
      <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke={colors[2]} strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

/* Sticker-style word, same language as the public site hero. */
function Sticker({ children, bg, fg, shadow, rotate = 0, delay = 0, reduce, className = "" }) {
  const motionProps = reduce
    ? { style: { transform: `rotate(${rotate}deg)` } }
    : {
        initial: { opacity: 0, scale: 0.7, rotate: 0 },
        animate: { opacity: 1, scale: 1, rotate },
        transition: { type: "spring", stiffness: 180, damping: 14, delay },
      };
  return (
    <motion.span
      {...motionProps}
      className={`inline-block rounded-2xl font-display font-extrabold ${className}`}
      style={{ ...(motionProps.style || {}), background: bg, color: fg, boxShadow: `0 6px 0 -2px ${shadow}` }}
    >
      {children}
    </motion.span>
  );
}

/* Pastel business-type tile (desktop panel). */
function Tile({ tile, i, reduce }) {
  const Icon = tile.icon;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: EASE }}
      className="group relative min-h-0 rounded-[1.6rem] flex flex-col items-center justify-center gap-2 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_30px_-18px_rgba(0,0,0,0.6)]"
      style={{ background: tile.bg }}
    >
      <span className="w-14 h-14 xl:w-16 xl:h-16 rounded-full bg-white shadow-[0_10px_20px_-8px_rgba(26,32,53,0.35)] flex items-center justify-center transition duration-300 group-hover:scale-110 group-hover:-rotate-6">
        <Icon size={26} strokeWidth={2.2} style={{ color: tile.ink }} />
      </span>
      <span className="text-[11px] xl:text-xs font-extrabold tracking-wide uppercase" style={{ color: NAVY }}>
        {tile.label}
      </span>
    </motion.div>
  );
}

/* Floating white card that gently bobs. Illustration only, labelled "Sample". */
function FloatCard({ className = "", delay = 0, reduce, children }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={`absolute z-10 ${className}`}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 5 + delay * 2, repeat: Infinity, ease: "easeInOut" }}
        className="bg-white rounded-2xl shadow-[0_18px_40px_-14px_rgba(11,14,28,0.6)] border border-white/70"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reduce = useReducedMotion();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      showError(error);
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const year = new Date().getFullYear();

  return (
    /* 100dvh + overflow-hidden: the whole page fits one screen on phones and desktops, no scrolling */
    <div
      className="h-[100dvh] overflow-hidden font-sans lg:grid lg:grid-cols-[5fr_6fr]"
      style={{ background: CREAM }}
    >
      {/* ───────────── LEFT: sign-in (the whole page on phones and tablets) ───────────── */}
      <div className="relative flex h-full flex-col overflow-hidden px-5 sm:px-12 xl:px-20 pt-5 sm:pt-8">
        {/* small brand shapes (desktop only) */}
        <svg className="absolute right-10 top-24 hidden lg:block" width="26" height="26" viewBox="0 0 28 28" aria-hidden="true">
          <rect x="11" y="0" width="6" height="28" rx="3" fill={GOLD} />
          <rect x="0" y="11" width="28" height="6" rx="3" fill={GOLD} />
        </svg>

        <Link to="/" className="w-fit flex-shrink-0" aria-label="In2Fest home">
          <img src={logo} alt="In2Fest" className="h-7 sm:h-8 w-auto" />
        </Link>

        <div className="flex-1 min-h-0 flex items-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="w-full max-w-md mx-auto lg:mx-0"
          >
            {/* Tagline stickers: phones and tablets only (desktop shows them on the right panel) */}
            <div className="lg:hidden flex flex-wrap items-center gap-2.5 mb-5 sm:mb-6">
              <Sticker bg={NAVY} fg="#fff" shadow="#0b0e1c" rotate={-2} delay={0.1} reduce={reduce} className="text-xl sm:text-2xl px-3 py-0.5">Run it.</Sticker>
              <Sticker bg={RED} fg="#fff" shadow="#9e0f1b" rotate={2} delay={0.2} reduce={reduce} className="text-xl sm:text-2xl px-3 py-0.5">Get it.</Sticker>
              <Sticker bg={GOLD} fg={NAVY} shadow="#d38a10" rotate={-1.5} delay={0.3} reduce={reduce} className="text-xl sm:text-2xl px-3 py-0.5">Found it.</Sticker>
            </div>

            <span className="inline-flex items-center gap-2 text-xs font-bold text-navy-600 bg-white rounded-full px-3.5 py-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: RED }} />
              For every local business
            </span>

            <h1
              className="mt-4 sm:mt-5 font-display font-extrabold text-3xl sm:text-[40px] leading-[1.05]"
              style={{ color: NAVY, letterSpacing: "-0.03em" }}
            >
              Welcome back
            </h1>
            <p className="mt-2.5 text-sm sm:text-[15px] text-navy-400 leading-relaxed [@media(max-height:640px)]:hidden">
              Sign in to manage your business, website and customers, all from one dashboard.
            </p>

            <div className="mt-6 sm:mt-8">
              <GoogleLoginButton />
            </div>

            <div className="mt-5 flex items-start gap-2 text-xs text-navy-400">
              <ShieldCheck size={15} className="text-navy-300 shrink-0 mt-px" />
              Secure sign-in with your Google account. We never post anything.
            </div>

            <InstallLink className="mt-3" />

            {/* Real facts only, no made-up user counts */}
            <ul className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-navy-100 flex flex-wrap gap-x-5 gap-y-2">
              {TRUST.map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-500">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check size={10} strokeWidth={3.5} className="text-white" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Desktop footer */}
        <p className="hidden lg:block flex-shrink-0 pb-6 text-xs text-navy-300">
          © {year}{" "}
          <a
            href="https://campussafar.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-navy-500 transition-colors"
          >
            Campussafar Technologies Private Limited®
          </a>
          . In2Fest™ is a trademark.
        </p>

        {/* Phone / tablet footer: navy strip with the logo arches, respects the iPhone home bar */}
        <div
          className="lg:hidden relative flex-shrink-0 -mx-5 sm:-mx-12 mt-3 overflow-hidden px-5 sm:px-12 pt-3"
          style={{ background: NAVY, paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <Arches className="absolute -right-6 -bottom-5 opacity-90" width={120} />
          <p className="relative max-w-[70%] text-[10px] leading-snug text-white/60">
            © {year} Campussafar Technologies Private Limited®. In2Fest™ is a trademark.
          </p>
        </div>
      </div>

      {/* ───────────── RIGHT: brand panel (desktop only) ───────────── */}
      <div className="hidden lg:block h-full p-4 pl-0">
        <div
          className="relative h-full rounded-[2rem] overflow-hidden flex flex-col p-5 xl:p-7"
          style={{ background: NAVY }}
        >
          <Arches className="absolute -right-12 -top-8 rotate-180 opacity-25" width={300} colors={["#ffffff", "#ffffff", "#ffffff"]} />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-[110px]" style={{ background: "rgba(245,166,35,0.18)" }} />

          {/* Business-type tiles + floating sample cards */}
          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-3">
              {TILES.map((t, i) => <Tile key={t.key} tile={t} i={i} reduce={reduce} />)}
            </div>

            <FloatCard className="left-4 top-[36%]" delay={0.6} reduce={reduce}>
              <div className="flex items-center gap-3 p-3 pr-5">
                <span className="w-10 h-10 rounded-full bg-[#25D366]/15 flex items-center justify-center">
                  <MessageCircle size={19} className="text-[#1da851]" />
                </span>
                <div>
                  <p className="text-[11px] text-navy-400 leading-none">New enquiry · Sample</p>
                  <p className="text-sm font-extrabold mt-1" style={{ color: NAVY }}>From your listing</p>
                </div>
              </div>
            </FloatCard>

            <FloatCard className="right-4 bottom-[8%]" delay={0.85} reduce={reduce}>
              <div className="flex items-center gap-3 p-3 pr-5">
                <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#FFF0C2" }}>
                  <IndianRupee size={18} style={{ color: "#d38a10" }} />
                </span>
                <div>
                  <p className="text-[11px] text-navy-400 leading-none">Fee received · Sample</p>
                  <p className="text-sm font-extrabold mt-1" style={{ color: NAVY }}>Monthly plan</p>
                </div>
              </div>
            </FloatCard>
          </div>

          {/* Tagline + feature chips */}
          <div className="relative flex-shrink-0 pt-6 xl:pt-7">
            <h2 className="font-display font-extrabold text-white flex flex-wrap items-center gap-x-3 gap-y-2" style={{ fontSize: "clamp(1.9rem, 3.4vw, 3.1rem)", letterSpacing: "-0.03em", lineHeight: 1 }}>
              <Sticker bg="#ffffff" fg={NAVY} shadow="rgba(255,255,255,0.35)" rotate={-2} delay={0.3} reduce={reduce} className="px-3.5 py-0.5">Run it.</Sticker>
              <Sticker bg={RED} fg="#fff" shadow="#9e0f1b" rotate={2} delay={0.4} reduce={reduce} className="px-3.5 py-0.5">Get it.</Sticker>
              <Sticker bg={GOLD} fg={NAVY} shadow="#d38a10" rotate={-1.5} delay={0.5} reduce={reduce} className="px-3.5 py-0.5">Found it.</Sticker>
            </h2>
            <p className="mt-4 text-sm text-white/70 max-w-lg leading-relaxed">
              Software to run your business, a website of your own, and customers who find you.
              One platform for gyms, libraries, restaurants, shops, clinics and events.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {FEATURES.map(({ icon: Icon, label }, i) => (
                <motion.span
                  key={label}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.55 + i * 0.07, ease: EASE }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 border border-white/20 rounded-full px-3 py-1.5"
                >
                  <Icon size={13} style={{ color: GOLD }} />
                  {label}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}