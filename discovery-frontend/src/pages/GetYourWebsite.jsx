import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useSpring,
  useMotionValue,
} from "framer-motion";
import {
  Globe, CalendarCheck, MessageCircle, Image as ImageIcon,
  BarChart3, Smartphone, CheckCircle2, XCircle, ArrowRight,
  Star, ShieldCheck, Zap, ChevronLeft, ChevronRight,
  Quote, BadgeCheck, Sparkles,
} from "lucide-react";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

// ─── Asset loaders ────────────────────────────────────────────────────────────
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
  { img: loadWebImg("slide1.jpg"), label: "Homepage",     tag: "Banquet Hall",  city: "Bhopal"    },
  { img: loadWebImg("slide2.jpg"), label: "Gallery",      tag: "Photographer",  city: "Indore"    },
  { img: loadWebImg("slide3.jpg"), label: "Packages",     tag: "Decorator",     city: "Jabalpur"  },
  { img: loadWebImg("slide4.jpg"), label: "Booking Page", tag: "Caterer",       city: "Bhopal"    },
  { img: loadWebImg("slide5.jpg"), label: "Reviews",      tag: "Makeup Artist", city: "Gwalior"   },
];

const FEATURES = [
  { icon: Globe,        title: "Your own URL, your own brand",    desc: "A real website -not a listing. Customers land on your page, see your name, your story, your gallery. First impression is yours alone.",                                                fallback: "website-builder.jpg"  },
  { icon: CalendarCheck,title: "Live availability calendar",      desc: "Customers see your real open dates instantly. Eliminates the endless back-and-forth of 'is this date free?'",                                                                           fallback: "booking-calendar.jpg" },
  { icon: MessageCircle,title: "Direct leads, zero commission",   desc: "Inquiries hit your WhatsApp or dashboard directly. We take nothing from your bookings -ever.",                                                                                         fallback: null                   },
  { icon: ImageIcon,    title: "Services & package showcase",     desc: "Display every tier, every add-on, with photos and videos that do your pitch before you pick up the phone.",                                                                              fallback: null                   },
  { icon: Star,         title: "Reviews that build trust",        desc: "Genuine customer reviews shown on your site. Social proof before the first call -so leads arrive warm.",                                                                               fallback: "quotation-review.jpg" },
  { icon: BarChart3,    title: "Insights dashboard",              desc: "See which pages people visit, where leads drop off, and what's driving bookings -so you improve what matters.",                                                                        fallback: "dashboard.jpg"        },
];

const COMPARISON = [
  { label: "Dedicated website with your own branding",       us: true,  them: false },
  { label: "Live booking calendar visible to customers",     us: true,  them: false },
  { label: "Direct WhatsApp/call leads, zero commission",    us: true,  them: false },
  { label: "Service & package showcase with pricing",        us: true,  them: false },
  { label: "Customer reviews on your own page",              us: true,  them: false },
  { label: "Analytics dashboard",                            us: true,  them: false },
  { label: "Just an entry in a crowded list",                us: false, them: true  },
];

const TESTIMONIALS = [
  { name: "Ramesh Verma",  role: "Banquet Hall Owner, Bhopal",     stars: 5, quote: "Earlier people would call just to ask 'is this date free?' Now they check my calendar and message directly when they're serious. Every inquiry converts." },
  { name: "Priya Sharma",  role: "Bridal Makeup Artist, Indore",   stars: 5, quote: "My website looks more professional than studios that have been running 10 years. Brides arrive having already seen my portfolio. The trust is built before we even talk." },
  { name: "Sunil Tiwari",  role: "Event Manager, Jabalpur",        stars: 5, quote: "I used to pay for JD and Sulekha both. Neither gave real leads. Corporate clients now find my website and call directly. No middleman, no commission lost." },
];

const STEPS = [
  { title: "Tell us about your business",   desc: "Your services, packages, photos, availability -guided onboarding collects everything." },
  { title: "Your website goes live",        desc: "A professional, mobile-ready site launches under your brand within the day."            },
  { title: "Start getting direct bookings", desc: "Customers check your calendar, review your packages, and reach you directly."           },
];

// ─── Reusable animation variants ─────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] } }),
};
const fadeLeft = {
  hidden:  { opacity: 0, x: -40 },
  visible: (delay = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] } }),
};
const fadeRight = {
  hidden:  { opacity: 0, x: 40 },
  visible: (delay = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] } }),
};
const scaleIn = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: (delay = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] } }),
};

// ─── Scroll-triggered wrapper ─────────────────────────────────────────────────
function Reveal({ children, variant = fadeUp, delay = 0, className = "", once = true }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      custom={delay}
      variants={variant}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Animated counter ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  useEffect(() => {
    return spring.on("change", (v) => setDisplay(Math.round(v)));
  }, [spring]);

  return <span ref={ref}>{display}{suffix}</span>;
}

// ─── Fan Card Carousel ────────────────────────────────────────────────────────
function PlaceholderScreen() {
  return (
    <div className="w-full h-full flex flex-col" style={{ background: "linear-gradient(160deg,#1a2035,#2a3151)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="w-16 h-2.5 rounded bg-white/20" />
        <div className="flex gap-2">
          <div className="w-8 h-2 rounded bg-white/10" />
          <div className="w-8 h-2 rounded bg-white/10" />
          <div className="w-12 h-5 rounded bg-accent-500/60" />
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3">
        <div className="w-3/4 h-4 rounded bg-white/25" />
        <div className="w-1/2 h-3 rounded bg-white/15" />
        <div className="w-1/3 h-7 rounded mt-1" style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }} />
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg" style={{ height: 52, background: `rgba(255,255,255,${0.06 + (i % 3) * 0.03})` }} />
          ))}
        </div>
        <div className="flex gap-2 mt-1">
          {[1, 2, 3].map((i) => <div key={i} className="flex-1 h-3 rounded bg-white/10" />)}
        </div>
      </div>
    </div>
  );
}

function FanCarousel() {
  const [active, setActive] = useState(2);
  const count = SLIDES.length;
  const prev = () => setActive((a) => (a - 1 + count) % count);
  const next = () => setActive((a) => (a + 1) % count);

  // auto-advance
  useEffect(() => {
    const t = setTimeout(next, 3200);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div className="relative flex flex-col items-center select-none">
      <div className="relative" style={{ height: 420, width: "100%", maxWidth: 540 }}>
        {SLIDES.map((slide, i) => {
          const diff = i - active;
          let d = diff;
          if (d > count / 2) d -= count;
          if (d < -count / 2) d += count;

          const isActive = d === 0;
          const angle = d * 15;
          const tx = d * 90;
          const scale = isActive ? 1 : 0.8 - Math.abs(d) * 0.04;
          const zIndex = 20 - Math.abs(d);
          const opacity = Math.abs(d) > 2 ? 0 : 1 - Math.abs(d) * 0.08;

          return (
            <motion.div
              key={i}
              onClick={() => !isActive && setActive(i)}
              animate={{ rotate: angle, x: tx, scale, zIndex, opacity }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              style={{
                position: "absolute", bottom: 0, left: "50%", marginLeft: -145,
                transformOrigin: "50% 115%", cursor: isActive ? "default" : "pointer", zIndex,
                width: 290,
              }}
            >
              {/* Glow ring on active */}
              {isActive && (
                <motion.div
                  layoutId="activeGlow"
                  className="absolute -inset-1 rounded-2xl"
                  style={{ background: "linear-gradient(135deg,#e8192c55,#f5a62355)", filter: "blur(8px)" }}
                />
              )}
              <div
                className={`relative rounded-2xl overflow-hidden border-2 shadow-2xl transition-colors ${
                  isActive ? "border-accent-400/70" : "border-white/20"
                }`}
                style={{ background: "#1a2035" }}
              >
                {/* Browser bar */}
                <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: "#0b0e1c" }}>
                  <span className="w-2 h-2 rounded-full bg-red-500/70" />
                  <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
                  <span className="w-2 h-2 rounded-full bg-green-400/70" />
                  <span className="ml-2 flex-1 text-[9px] text-white/30 px-2 py-0.5 rounded truncate" style={{ background: "rgba(255,255,255,0.07)" }}>
                    in2fest.com/{slide.tag.toLowerCase().replace(" ", "-")}/...
                  </span>
                </div>
                <div className="relative" style={{ height: 330 }}>
                  {slide.img
                    ? <img src={slide.img} alt={slide.label} className="w-full h-full object-cover object-top" onError={(e) => { e.target.style.display = "none"; }} />
                    : <PlaceholderScreen />
                  }
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">{slide.label}</span>
                    <span className="text-[10px] font-semibold text-white bg-accent-600/80 backdrop-blur-sm px-2 py-1 rounded-full">{slide.tag} · {slide.city}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-6">
        <button onClick={prev} className="w-9 h-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <ChevronLeft size={16} className="text-white" />
        </button>
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setActive(i)}
              animate={{ width: i === active ? 20 : 8, backgroundColor: i === active ? "#e8192c" : "rgba(255,255,255,0.3)" }}
              className="h-2 rounded-full"
            />
          ))}
        </div>
        <button onClick={next} className="w-9 h-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <ChevronRight size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}

// ─── Floating particles (hero decoration) ────────────────────────────────────
function Particles() {
  const dots = Array.from({ length: 18 });
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            background: i % 5 === 0 ? "#f5a623" : "rgba(255,255,255,0.25)",
            left: `${(i * 17 + 5) % 95}%`,
            top: `${(i * 23 + 10) % 90}%`,
          }}
          animate={{ y: [0, -18, 0], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Animated section heading ─────────────────────────────────────────────────
function SectionHead({ eyebrow, heading, light = false }) {
  return (
    <Reveal variant={fadeUp} className="text-center mb-12 md:mb-14">
      <span
        className="inline-block text-xs font-bold tracking-widest uppercase mb-3 px-3 py-1 rounded-full"
        style={{ color: "#e8192c", background: light ? "rgba(232,25,44,0.12)" : "rgba(232,25,44,0.08)" }}
      >
        {eyebrow}
      </span>
      <h2 className={`font-display font-extrabold text-2xl md:text-3xl ${light ? "text-white" : "text-navy-900"}`}>
        {heading}
      </h2>
    </Reveal>
  );
}

// ─── Animated progress line (steps connector) ────────────────────────────────
function StepConnector() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <div ref={ref} aria-hidden className="hidden md:block absolute top-10 left-[calc(16.66%+16px)] right-[calc(16.66%+16px)] h-px overflow-hidden">
      <motion.div
        className="h-full origin-left"
        style={{ background: "linear-gradient(90deg,#e8192c,#f5a623)" }}
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function GetYourWebsite() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div style={{ background: "#faf9ff" }}>

      {/* ══════════════════════════════════════════════════════════
          HERO  - parallax + fan carousel
      ══════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0b0e1c 0%,#1a2035 55%,#2a3151 100%)" }}
      >
        <Particles />

        {/* Parallax glow */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 70% 55% at 75% 60%, rgba(232,25,44,0.11) 0%, transparent 70%)",
            y: heroY,
          }}
        />

        <motion.div
          className="max-w-6xl mx-auto px-4 pt-14 pb-0 md:pt-20 relative z-10"
          style={{ opacity: heroOpacity }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end">

            {/* Left copy */}
            <div className="pb-16 md:pb-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-6"
              >
                <BadgeCheck size={13} style={{ color: "#f5a623" }} />
                <span className="text-xs font-semibold text-white/80">Real websites, not just listings</span>
              </motion.div>

              <div className="overflow-hidden mb-5">
                {["Your business deserves", "more than a row in", "someone's directory."].map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: "110%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.65, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h1
                      className="font-display font-extrabold text-white leading-[1.08]"
                      style={{
                        fontSize: "clamp(2rem,5vw,3.2rem)",
                        letterSpacing: "-0.025em",
                        color: i === 2 ? "#f5a623" : undefined,
                      }}
                    >
                      {line}
                    </h1>
                  </motion.div>
                ))}
              </div>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="text-white/65 text-sm md:text-base leading-relaxed mb-8 max-w-md"
              >
                Every vendor on In2Fest gets their own professional website -with live availability,
                service packages, reviews, and direct booking. Zero commission. Zero shared space.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.68, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-wrap gap-3 mb-10"
              >
                <motion.a
                  href={`${APP_URL}/login`}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
                >
                  Get My Website Free <ArrowRight size={15} />
                </motion.a>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/search"
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white/80 border border-white/20 hover:bg-white/10 transition-colors"
                  >
                    See Live Examples
                  </Link>
                </motion.div>
              </motion.div>

              {/* Trust micro-stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.85 }}
                className="flex flex-wrap gap-6"
              >
                {[
                  { n: 500, suffix: "+", label: "Live vendor sites"    },
                  { n: 0,   suffix: "%", label: "Commission on leads"  },
                  { n: 1,   suffix: " day", label: "To go live"        },
                ].map(({ n, suffix, label }) => (
                  <div key={label}>
                    <p className="font-display font-extrabold text-white text-xl leading-tight">
                      <AnimatedNumber value={n} suffix={suffix} />
                    </p>
                    <p className="text-white/45 text-xs">{label}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: fan carousel */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center lg:justify-end pb-0 overflow-visible"
            >
              <div className="w-full max-w-[520px]">
                <FanCarousel />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Curve */}
        <div style={{ lineHeight: 0 }}>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" style={{ height: 60 }}>
            <path d="M0,0 C480,60 960,60 1440,0 L1440,60 L0,60 Z" fill="#faf9ff" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURES  - staggered card entrance
      ══════════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <SectionHead eyebrow="Everything included" heading="Built to turn visitors into bookings" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, fallback }, i) => {
            const tkImg = fallback ? loadToolkitImg(fallback) : null;
            return (
              <Reveal key={title} variant={scaleIn} delay={i * 0.08}>
                <motion.div
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full"
                  whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(26,32,53,0.12)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  {tkImg && (
                    <div className="h-36 overflow-hidden">
                      <motion.img
                        src={tkImg} alt={title}
                        className="w-full h-full object-cover"
                        whileHover={{ scale: 1.08 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <motion.div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: "#e8192c10" }}
                      whileHover={{ rotate: [0, -8, 8, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      <Icon size={18} style={{ color: "#e8192c" }} />
                    </motion.div>
                    <h3 className="font-semibold text-navy-900 text-sm mb-1.5">{title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          COMPARISON  - rows stagger in from left
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: "#fff" }} className="py-16 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <SectionHead eyebrow="Why it's different" heading="A website, not another entry in a list" />

          <Reveal variant={scaleIn}>
            <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-3 text-xs md:text-sm font-semibold text-center" style={{ background: "#1a2035" }}>
                <div className="py-4 text-left pl-5 md:pl-7 text-white/60">Feature</div>
                <div className="py-4 text-white">In2Fest Website</div>
                <div className="py-4 text-white/45">Directory Listings</div>
              </div>
              {COMPARISON.map((row, i) => (
                <Reveal key={row.label} variant={fadeLeft} delay={i * 0.07}>
                  <div className={`grid grid-cols-3 items-center text-xs md:text-sm ${i % 2 === 0 ? "bg-white" : "bg-gray-50/70"}`}>
                    <div className="py-3.5 pl-5 md:pl-7 pr-3 text-gray-700">{row.label}</div>
                    <div className="py-3.5 flex justify-center">
                      {row.us
                        ? <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 400, damping: 16, delay: i * 0.07 + 0.2 }}>
                            <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
                          </motion.div>
                        : <XCircle size={18} className="text-gray-200" />}
                    </div>
                    <div className="py-3.5 flex justify-center">
                      {row.them
                        ? <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
                        : <XCircle size={18} className="text-gray-200" />}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS  - step-by-step with animated connector
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: "#faf9ff" }} className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <SectionHead eyebrow="How it works" heading="Live in three simple steps" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            <StepConnector />
            {STEPS.map(({ title, desc }, i) => (
              <Reveal key={title} variant={fadeUp} delay={i * 0.15}>
                <motion.div
                  className="relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm text-center"
                  whileHover={{ y: -5, boxShadow: "0 16px 36px rgba(26,32,53,0.1)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  <motion.div
                    className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 font-display font-extrabold text-sm text-white"
                    style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    {i + 1}
                  </motion.div>
                  <h3 className="font-semibold text-navy-900 text-sm mb-2">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TESTIMONIALS  - staggered slide in from right
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: "#fff" }} className="py-16 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4">
          <SectionHead eyebrow="What vendors say" heading="From vendors who switched" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ name, role, quote, stars }, i) => (
              <Reveal key={name} variant={fadeUp} delay={i * 0.12}>
                <motion.div
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col gap-4 h-full"
                  whileHover={{ y: -5, boxShadow: "0 16px 36px rgba(26,32,53,0.08)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  <motion.div
                    initial={{ opacity: 0.1, scale: 0.7 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.12 + 0.2 }}
                  >
                    <Quote size={22} style={{ color: "#e8192c30" }} />
                  </motion.div>
                  <p className="text-sm text-gray-700 leading-relaxed flex-1">"{quote}"</p>
                  <div>
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: stars }).map((_, si) => (
                        <motion.div
                          key={si}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.12 + si * 0.06 + 0.3, type: "spring", stiffness: 400 }}
                        >
                          <Star size={12} fill="#f5a623" style={{ color: "#f5a623" }} />
                        </motion.div>
                      ))}
                    </div>
                    <p className="font-semibold text-navy-900 text-sm">{name}</p>
                    <p className="text-xs text-gray-400">{role}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TRUST BAR  - icons pop in one by one
      ══════════════════════════════════════════════════════════ */}
      <section className="py-10 border-t border-gray-100" style={{ background: "#faf9ff" }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { icon: ShieldCheck, text: "Verified vendor profiles" },
              { icon: Smartphone,  text: "Fully mobile optimised"  },
              { icon: MessageCircle, text: "Zero commission on leads" },
              { icon: Zap,         text: "Goes live in one day"    },
            ].map(({ icon: Icon, text }, i) => (
              <Reveal key={text} variant={fadeUp} delay={i * 0.1}>
                <motion.span
                  className="flex items-center gap-2 text-sm text-gray-500"
                  whileHover={{ color: "#1a2035" }}
                >
                  <motion.span
                    whileHover={{ scale: 1.3, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 14 }}
                  >
                    <Icon size={15} style={{ color: "#e8192c" }} />
                  </motion.span>
                  {text}
                </motion.span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FINAL CTA  - scale in with pulsing glow ring
      ══════════════════════════════════════════════════════════ */}
      <section className="px-4 pb-20 pt-4">
        <Reveal variant={scaleIn}>
          <div
            className="max-w-5xl mx-auto rounded-3xl px-6 py-16 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,#1a2035 0%,#2a3151 100%)" }}
          >
            {/* pulsing glow */}
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none rounded-3xl"
              style={{ background: "radial-gradient(ellipse 60% 55% at 50% 100%, rgba(232,25,44,0.22) 0%, transparent 70%)" }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* floating sparkles */}
            {["-20%", "0%", "20%"].map((x, i) => (
              <motion.div
                key={i}
                aria-hidden
                className="absolute top-6 pointer-events-none"
                style={{ left: `calc(50% + ${x})` }}
                animate={{ y: [0, -12, 0], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
              >
                <Sparkles size={14} style={{ color: "#f5a62360" }} />
              </motion.div>
            ))}

            <div className="relative z-10">
              <Reveal variant={fadeUp} delay={0.1}>
                <span
                  className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full"
                  style={{ color: "#f5a623", background: "rgba(245,166,35,0.15)" }}
                >
                  Ready to start?
                </span>
                <h2 className="font-display font-extrabold text-white text-2xl md:text-3xl mb-3 leading-tight">
                  Stop sharing a page with 300 competitors.
                </h2>
                <p className="text-white/60 text-sm md:text-base max-w-lg mx-auto mb-8">
                  Get your own website with live booking, your gallery, your reviews —
                  and keep every rupee from every lead.
                </p>
              </Reveal>
              <Reveal variant={fadeUp} delay={0.2}>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <motion.a
                    href={`${APP_URL}/login`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
                  >
                    Get My Website <ArrowRight size={15} />
                  </motion.a>
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      to="/search"
                      className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white/70 border border-white/20 hover:bg-white/10 transition-colors"
                    >
                      Browse Live Sites
                    </Link>
                  </motion.div>
                </div>
              </Reveal>
            </div>
          </div>
        </Reveal>
      </section>

    </div>
  );
}