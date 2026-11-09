import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Globe, CalendarCheck, MessageCircle, Image as ImageIcon, BarChart3, Smartphone,
  CheckCircle2, XCircle, ArrowRight, Star, ShieldCheck, Zap, ChevronLeft, ChevronRight,
  Quote, LayoutDashboard, MapPin, BadgeCheck,
} from "lucide-react";
import { BASE_DOMAIN, BRAND_NAME } from "../lib/constants";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";
const EASE = [0.22, 1, 0.36, 1];

const TITLE = `Get your own business website - ${BRAND_NAME}`;
const DESCRIPTION =
  "Every business on In2Fest gets its own professional website with services, plans, gallery, reviews, availability and direct enquiries on WhatsApp. No commission on your customers.";

// ─── Asset loaders (unchanged paths) ─────────────────────────────────────────
function loadWebImg(name) {
  try { return new URL(`../assets/web-image/${name}`, import.meta.url).href; }
  catch { return null; }
}
function loadToolkitImg(name) {
  try { return new URL(`../assets/vendor-toolkit/${name}`, import.meta.url).href; }
  catch { return null; }
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const SLIDES = [
  { img: loadWebImg("slide1.jpg"), label: "Homepage" },
  { img: loadWebImg("slide2.jpg"), label: "Gallery" },
  { img: loadWebImg("slide3.jpg"), label: "Packages" },
  { img: loadWebImg("slide4.jpg"), label: "Booking page" },
  { img: loadWebImg("slide5.jpg"), label: "Reviews" },
];

// Bento grid on a 6-column desktop grid: spans 4/2, 2/4, 3/3.
const FEATURES = [
  { icon: Globe, title: "Your own address, your own brand", desc: "A real website, not a listing. Customers land on your page and see your name, your story and your gallery. The first impression is yours alone.", tint: "#FFE6D6", ink: "#e8192c", span: "lg:col-span-4", img: "website-builder.jpg" },
  { icon: CalendarCheck, title: "Live availability", desc: "Customers see your open dates instantly, so no more back-and-forth.", tint: "#DDF3E8", ink: "#0f8a5f", span: "lg:col-span-2", img: "booking-calendar.jpg" },
  { icon: MessageCircle, title: "Direct leads, no commission", desc: "Enquiries reach your WhatsApp or dashboard directly. We take nothing from your customers.", tint: "#E0EAFF", ink: "#3a5bd9", span: "lg:col-span-2" },
  { icon: ImageIcon, title: "Services and plans showcase", desc: "Show every service, plan and add-on with photos and videos that do the pitch before you pick up the phone.", tint: "#FFF0C2", ink: "#d38a10", span: "lg:col-span-4" },
  { icon: Star, title: "Reviews that build trust", desc: "Genuine customer reviews on your own page, so leads arrive warm.", tint: "#FFE0E3", ink: "#e8192c", span: "lg:col-span-3", img: "quotation-review.jpg" },
  { icon: BarChart3, title: "Insights dashboard", desc: "See which pages people visit and what drives enquiries, so you improve what matters.", tint: "#DDF3E8", ink: "#0f8a5f", span: "lg:col-span-3", img: "dashboard.jpg" },
];

const COMPARISON = [
  { label: "Dedicated website with your own branding", us: true, them: false },
  { label: "Live availability visible to customers", us: true, them: false },
  { label: "Direct WhatsApp or call leads, zero commission", us: true, them: false },
  { label: "Services and plans showcase with pricing", us: true, them: false },
  { label: "Customer reviews on your own page", us: true, them: false },
  { label: "Analytics dashboard", us: true, them: false },
  { label: "A listing page shared with your competitors", us: false, them: true },
];

// Add REAL vendor quotes here (with their permission). The section stays hidden while this is empty.
// Shape: { name: "Full name", role: "Business, City", quote: "…", stars: 5 }
const TESTIMONIALS = [];

const STEPS = [
  { title: "Tell us about your business", desc: "Your services, plans, photos and availability. Guided onboarding collects everything.", bg: "#e8192c", fg: "#fff" },
  { title: "Your website goes live", desc: "A professional, mobile-ready site launches under your brand.", bg: "#f5a623", fg: "#1a2035" },
  { title: "Start getting direct enquiries", desc: "Customers check your services, read your reviews and reach you directly.", bg: "#1a2035", fg: "#fff" },
];

const FACTS = [
  { icon: ShieldCheck, text: "Verified vendor profiles" },
  { icon: Smartphone, text: "Fully mobile optimised" },
  { icon: MessageCircle, text: "Zero commission on leads" },
  { icon: Zap, text: "Quick to set up" },
];

// ─── Small helpers ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 24, className = "" }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ eyebrow, title, sub }) {
  return (
    <Reveal className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
      <p className="text-xs font-extrabold tracking-[0.18em] uppercase text-gold-600 mb-3">{eyebrow}</p>
      <h2
        className="font-display font-extrabold text-navy-700"
        style={{ fontSize: "clamp(1.75rem,4vw,2.7rem)", letterSpacing: "-0.025em", lineHeight: 1.1 }}
      >
        {title}
      </h2>
      {sub && <p className="mt-4 text-navy-400 text-base md:text-lg leading-relaxed">{sub}</p>}
    </Reveal>
  );
}

// The arch from the In2Fest logo, used as a brand motif.
function Arches({ className = "", width = 260, colors = ["#f5a623", "#e8192c", "#ffffff"] }) {
  return (
    <svg className={className} width={width} height={width / 2} viewBox="0 0 220 110" aria-hidden="true">
      <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke={colors[0]} strokeWidth="18" strokeLinecap="round" />
      <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke={colors[1]} strokeWidth="18" strokeLinecap="round" />
      <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke={colors[2]} strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

function Floaty({ children, className = "", delay = 0 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

const Plus = ({ size = 28, color = "#f5a623" }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
    <rect x="11" y="0" width="6" height="28" rx="3" fill={color} />
    <rect x="0" y="11" width="28" height="6" rx="3" fill={color} />
  </svg>
);
const Ring = ({ size = 40, color = "#e8192c", stroke = 7 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r={20 - stroke / 2} fill="none" stroke={color} strokeWidth={stroke} />
  </svg>
);

const stickerRed =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 text-white font-extrabold " +
  "shadow-[0_5px_0_0_#9e0f1b] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_7px_0_0_#9e0f1b] " +
  "active:translate-y-1 active:shadow-none";

// Image that quietly disappears if the file is missing.
function SoftImg({ name, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  const src = name ? loadToolkitImg(name) : null;
  if (!src || failed) return null;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />;
}

// ─── Fan carousel of sample sites ────────────────────────────────────────────
function PlaceholderScreen() {
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-navy-700 to-navy-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="w-16 h-2.5 rounded bg-white/20" />
        <div className="flex gap-2">
          <div className="w-8 h-2 rounded bg-white/10" />
          <div className="w-8 h-2 rounded bg-white/10" />
          <div className="w-12 h-5 rounded bg-accent-500/70" />
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3">
        <div className="w-3/4 h-4 rounded bg-white/25" />
        <div className="w-1/2 h-3 rounded bg-white/15" />
        <div className="w-1/3 h-7 rounded bg-gold-500 mt-1" />
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg" style={{ height: 52, background: `rgba(255,255,255,${0.06 + (i % 3) * 0.03})` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideImage({ slide }) {
  const [failed, setFailed] = useState(false);
  if (!slide.img || failed) return <PlaceholderScreen />;
  return (
    <img
      src={slide.img}
      alt={`${slide.label} of a sample business website`}
      onError={() => setFailed(true)}
      className="w-full h-full object-cover object-top"
    />
  );
}

function FanCarousel() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(2);
  const [paused, setPaused] = useState(false);
  const count = SLIDES.length;
  const prev = () => setActive((a) => (a - 1 + count) % count);
  const next = () => setActive((a) => (a + 1) % count);

  useEffect(() => {
    if (reduce || paused) return undefined;
    const t = setTimeout(() => setActive((a) => (a + 1) % count), 3400);
    return () => clearTimeout(t);
  }, [active, reduce, paused, count]);

  return (
    <div
      className="relative flex flex-col items-center select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative w-full" style={{ height: 410, maxWidth: 760 }} aria-roledescription="carousel" aria-label="Sample business websites">
        {SLIDES.map((slide, i) => {
          let d = i - active;
          if (d > count / 2) d -= count;
          if (d < -count / 2) d += count;
          const isActive = d === 0;
          const scale = isActive ? 1 : 0.84 - Math.abs(d) * 0.04;
          const opacity = Math.abs(d) > 2 ? 0 : 1 - Math.abs(d) * 0.1;

          return (
            <motion.div
              key={i}
              onClick={() => !isActive && setActive(i)}
              animate={{ rotate: d * 12, x: d * 150, scale, opacity }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 26 }}
              style={{
                position: "absolute", bottom: 0, left: "50%", marginLeft: -145, width: 290,
                transformOrigin: "50% 115%", cursor: isActive ? "default" : "pointer", zIndex: 20 - Math.abs(d),
              }}
              aria-hidden={!isActive}
            >
              <div
                className={`rounded-3xl overflow-hidden bg-white border-2 transition-colors shadow-[0_30px_60px_-24px_rgba(26,32,53,0.55)] ${
                  isActive ? "border-gold-500" : "border-navy-100"
                }`}
              >
                <div className="flex items-center gap-1.5 px-3 py-2 bg-navy-50 border-b border-navy-100">
                  <span className="w-2 h-2 rounded-full bg-accent-500/70" />
                  <span className="w-2 h-2 rounded-full bg-gold-500/80" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
                  <span className="ml-2 flex-1 text-[9px] text-navy-400 px-2 py-0.5 rounded-full bg-white truncate">
                    yourbusiness.{BASE_DOMAIN}
                  </span>
                </div>
                <div className="relative" style={{ height: 320 }}>
                  <SlideImage slide={slide} />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <span className="text-[10px] font-extrabold text-navy-700 bg-white/95 px-2.5 py-1 rounded-full">{slide.label}</span>
                    <span className="text-[10px] font-bold text-white bg-navy-700/85 px-2.5 py-1 rounded-full">Sample site</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-6">
        <button onClick={prev} aria-label="Previous sample" className="w-10 h-10 rounded-full border-2 border-navy-100 bg-white flex items-center justify-center hover:border-navy-700 transition-colors">
          <ChevronLeft size={16} className="text-navy-700" />
        </button>
        <div className="flex gap-1.5" role="tablist" aria-label="Choose a sample">
          {SLIDES.map((s, i) => (
            <button
              key={s.label}
              role="tab"
              aria-selected={i === active}
              aria-label={s.label}
              onClick={() => setActive(i)}
              className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-accent-500" : "w-2 bg-navy-200"}`}
            />
          ))}
        </div>
        <button onClick={next} aria-label="Next sample" className="w-10 h-10 rounded-full border-2 border-navy-100 bg-white flex items-center justify-center hover:border-navy-700 transition-colors">
          <ChevronRight size={16} className="text-navy-700" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function GetYourWebsite() {
  const reduce = useReducedMotion();
  const rise = (delay) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.65, delay, ease: EASE } };

  return (
    <div className="bg-white">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`https://${BASE_DOMAIN}/get-website`} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
      </Helmet>

      {/* ══ HERO ══ */}
      <section className="relative overflow-hidden bg-[#FFF6E8]">
        <Floaty className="absolute left-[7%] top-20 hidden md:block"><Plus size={30} /></Floaty>
        <Floaty className="absolute right-[8%] top-28 hidden md:block" delay={1}><Ring size={44} /></Floaty>
        <Arches className="absolute -left-16 bottom-0 opacity-90 hidden lg:block" width={300} colors={["#f5a623", "#e8192c", "#1a2035"]} />
        <Arches className="absolute -right-16 bottom-0 opacity-90 hidden lg:block" width={300} colors={["#1a2035", "#e8192c", "#f5a623"]} />

        <div className="relative max-w-5xl mx-auto px-4 pt-14 md:pt-20 text-center">
          <motion.p
            {...rise(0)}
            className="inline-flex items-center gap-2 text-xs font-bold text-navy-600 bg-white rounded-full px-4 py-2 shadow-sm"
          >
            <BadgeCheck size={14} className="text-gold-600" /> Real websites, not just listings
          </motion.p>

          <h1
            className="font-display font-extrabold text-navy-700 mt-6 flex flex-col items-center gap-4"
            style={{ fontSize: "clamp(2.4rem,7vw,5rem)", letterSpacing: "-0.035em", lineHeight: 1 }}
          >
            <motion.span
              {...(reduce ? {} : { initial: { opacity: 0, scale: 0.7, rotate: 0 }, animate: { opacity: 1, scale: 1, rotate: -2.5 }, transition: { type: "spring", stiffness: 180, damping: 14, delay: 0.15 } })}
              className="inline-block bg-accent-500 text-white rounded-2xl px-6 pb-1.5 pt-0.5 shadow-[0_14px_0_-6px_#9e0f1b]"
            >
              Get it.
            </motion.span>
            <motion.span {...rise(0.3)} className="block">
              Your own website,<br className="hidden sm:block" /> not just a listing.
            </motion.span>
          </h1>

          <motion.p {...rise(0.45)} className="mt-7 text-base md:text-xl text-navy-500 max-w-2xl mx-auto leading-relaxed">
            Every business on {BRAND_NAME} gets a professional website with services, plans, gallery,
            reviews and direct enquiries. Zero commission on your customers.
          </motion.p>

          <motion.div {...rise(0.55)} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a href={`${APP_URL}/login`} className={`${stickerRed} px-8 py-4 text-sm`}>
              Get my website free <ArrowRight size={16} />
            </a>
            <Link
              to="/search"
              className="inline-flex items-center justify-center rounded-full border-2 border-navy-700 px-8 py-4 text-sm font-extrabold text-navy-700 hover:bg-navy-700 hover:text-white transition"
            >
              See live examples
            </Link>
          </motion.div>

          <motion.div {...rise(0.65)} className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-navy-500">
            {["0% commission on your customers", "Mobile-ready", "On your own in2fest.com address"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> {t}
              </span>
            ))}
          </motion.div>

          <motion.div {...rise(0.75)} className="mt-12 pb-12 md:pb-16">
            <FanCarousel />
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURES (bento) ══ */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHead
            eyebrow="Everything included"
            title="Built to turn visitors into customers."
            sub="Everything a customer wants to see before they call you, on one page that belongs to you."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, tint, ink, span, img }, i) => (
              <Reveal key={title} delay={(i % 3) * 0.08} className={`${span} ${i === 0 ? "sm:col-span-2" : ""}`}>
                <div
                  className="h-full rounded-[2rem] p-6 md:p-7 flex flex-col transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_44px_-26px_rgba(26,32,53,0.5)]"
                  style={{ background: tint }}
                >
                  <span className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                    <Icon size={22} strokeWidth={2.2} style={{ color: ink }} />
                  </span>
                  <h3 className="mt-5 font-display font-extrabold text-navy-700 text-lg md:text-xl leading-snug" style={{ letterSpacing: "-0.01em" }}>
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-navy-500 leading-relaxed">{desc}</p>
                  {img && (
                    <div className="mt-5 rounded-2xl overflow-hidden bg-white/60 empty:hidden">
                      <SoftImg name={img} alt={title} className="w-full h-40 object-cover object-top" />
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Run it / Get it / Found it ══ */}
      <section className="bg-[#FFF6E8] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHead
            eyebrow="One platform"
            title="Your website works with everything else."
            sub="The website is one part. Your software and your marketplace listing are connected to it."
          />
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { to: "/for-vendors", word: "Run it.", desc: "Software for members, bookings and billing.", icon: LayoutDashboard, bg: "#1a2035", fg: "#fff", sub: "rgba(255,255,255,.72)", ic: "#f5a623", here: false },
              { to: "/get-website", word: "Get it.", desc: "Your own website on your own address.", icon: Globe, bg: "#e8192c", fg: "#fff", sub: "rgba(255,255,255,.85)", ic: "#fff", here: true },
              { to: "/join", word: "Found it.", desc: "A free listing customers can find by city.", icon: MapPin, bg: "#f5a623", fg: "#1a2035", sub: "rgba(26,32,53,.78)", ic: "#1a2035", here: false },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <Reveal key={c.word} delay={i * 0.1}>
                  <Link
                    to={c.to}
                    className="group relative block h-full rounded-[2rem] p-7 overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_44px_-26px_rgba(26,32,53,0.6)]"
                    style={{ background: c.bg, color: c.fg }}
                    aria-current={c.here ? "page" : undefined}
                  >
                    <Arches className="absolute -right-8 -bottom-4 opacity-20" width={190} colors={[c.fg, c.fg, c.fg]} />
                    <span className="relative w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                      <Icon size={22} strokeWidth={2.2} style={{ color: c.ic }} />
                    </span>
                    <p className="relative mt-5 font-display font-extrabold text-4xl" style={{ letterSpacing: "-0.03em" }}>{c.word}</p>
                    <p className="relative mt-2 text-sm leading-relaxed max-w-[16rem]" style={{ color: c.sub }}>{c.desc}</p>
                    <span className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-extrabold">
                      {c.here ? "You are here" : "Learn more"} {!c.here && <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />}
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ COMPARISON ══ */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <SectionHead eyebrow="Why it's different" title="A website, not another entry in a list." />
          <Reveal>
            <div className="rounded-3xl border-2 border-navy-700 overflow-hidden bg-white">
              <div className="grid grid-cols-[1.6fr_1fr_1fr] text-xs md:text-sm font-extrabold text-center border-b-2 border-navy-700">
                <div className="py-4 text-left pl-5 md:pl-7 text-navy-400 font-medium">Feature</div>
                <div className="py-4 bg-accent-500 text-white">{BRAND_NAME} website</div>
                <div className="py-4 text-navy-500">Directory listing</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[1.6fr_1fr_1fr] items-center text-xs md:text-sm border-b last:border-0 border-navy-50 ${i % 2 ? "bg-[#FFFBF3]" : "bg-white"}`}
                >
                  <div className="py-3.5 pl-5 md:pl-7 pr-3 font-medium text-navy-600">{row.label}</div>
                  <div className="py-3.5 flex justify-center bg-accent-50/60">
                    {row.us ? <CheckCircle2 size={20} className="text-emerald-600" aria-label="Yes" /> : <XCircle size={20} className="text-navy-200" aria-label="No" />}
                  </div>
                  <div className="py-3.5 flex justify-center">
                    {row.them ? <CheckCircle2 size={20} className="text-navy-300" aria-label="Yes" /> : <XCircle size={20} className="text-navy-200" aria-label="No" />}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ STEPS ══ */}
      <section className="bg-[#FFF6E8] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHead eyebrow="How it works" title="Live in three simple steps." />
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.1}>
                <div
                  className="h-full rounded-[2rem] p-8 transition duration-300 hover:-translate-y-1.5"
                  style={{ background: s.bg, color: s.fg }}
                >
                  <span className="font-display font-extrabold text-7xl opacity-30 leading-none" aria-hidden="true">{i + 1}</span>
                  <h3 className="mt-2 font-display font-extrabold text-xl md:text-2xl leading-snug">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed opacity-85">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ REAL VENDOR QUOTES (hidden until you add real ones) ══ */}
      {TESTIMONIALS.length > 0 && (
        <section className="bg-white py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-4">
            <SectionHead eyebrow="What vendors say" title="From businesses on In2Fest." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS.map(({ name, role, quote, stars = 5 }, i) => (
                <Reveal key={name} delay={i * 0.1}>
                  <div className="h-full rounded-3xl bg-[#FFF6E8] border border-navy-100 p-6 flex flex-col gap-4">
                    <Quote size={24} className="text-accent-500/40" />
                    <p className="text-sm text-navy-600 leading-relaxed flex-1">&ldquo;{quote}&rdquo;</p>
                    <div>
                      <div className="flex gap-0.5 mb-2">
                        {Array.from({ length: stars }).map((_, si) => (
                          <Star key={si} size={13} className="fill-gold-500 text-gold-500" />
                        ))}
                      </div>
                      <p className="font-extrabold text-navy-700 text-sm">{name}</p>
                      <p className="text-xs text-navy-400">{role}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ TRUST BAR ══ */}
      <section className="bg-white py-10 border-y border-navy-50">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {FACTS.map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-2.5 text-sm font-bold text-navy-500">
              <span className="w-9 h-9 rounded-xl bg-[#FFF6E8] flex items-center justify-center">
                <Icon size={16} className="text-accent-500" />
              </span>
              {text}
            </span>
          ))}
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section className="relative overflow-hidden bg-navy-700 py-20 md:py-28">
        <Arches className="absolute -left-16 -bottom-10 opacity-90 hidden md:block" width={340} />
        <Arches className="absolute -right-16 -bottom-10 opacity-90 hidden md:block" width={340} />
        <Floaty className="absolute left-[18%] top-12 hidden md:block"><Plus size={26} /></Floaty>
        <Floaty className="absolute right-[18%] top-16 hidden md:block" delay={1}><Ring size={38} color="#f5a623" /></Floaty>
        <Reveal className="relative max-w-3xl mx-auto px-4 text-center">
          <h2
            className="font-display font-extrabold text-white"
            style={{ fontSize: "clamp(2.1rem,6vw,4rem)", letterSpacing: "-0.03em", lineHeight: 1.04 }}
          >
            Stop sharing a page with <span className="text-gold-500">your competitors.</span>
          </h2>
          <p className="mt-5 text-white/75 text-base md:text-lg max-w-xl mx-auto">
            Get your own website with your services, gallery and reviews, and keep every customer you win.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a href={`${APP_URL}/login`} className={`${stickerRed} px-9 py-4 text-sm`}>
              Get my website <ArrowRight size={16} />
            </a>
            <Link
              to="/search"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/30 hover:border-white px-9 py-4 text-sm font-extrabold text-white transition"
            >
              Browse live sites
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}