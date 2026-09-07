import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShieldCheck, MessageCircle, Star, ChevronRight, Globe, CalendarCheck } from "lucide-react";
import { CATEGORIES, BRAND_NAME } from "../../lib/constants";
import api from "../../lib/api";

let heroBg = null;
try { heroBg = new URL("../../assets/hero.png", import.meta.url).href; } catch {}

const POPULAR_SEARCHES = [
  { label: "Marriage Hall",  slug: "marriage-hall" },
  { label: "Photographer",   slug: "photographer" },
  { label: "Decorator",      slug: "decorator" },
  { label: "Caterer",        slug: "caterer" },
  { label: "DJ",             slug: "dj" },
  { label: "Makeup Artist",  slug: "makeup-artist" },
];

const TRUST = [
  { icon: ShieldCheck,   text: "Verified vendors" },
  { icon: MessageCircle, text: "Direct WhatsApp contact" },
  { icon: Star,          text: "Real reviews" },
];

// ─── Floating Petal Particle Canvas ─────────────────────────────────────────
function PetalCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const PETAL_COLORS = ["#f5a623", "#e8192c", "#ffd27f", "#ff6b6b", "#ffb347", "#fff0a0"];

    class Petal {
      constructor() { this.reset(true); }
      reset(init = false) {
        this.x = Math.random() * W;
        this.y = init ? Math.random() * H : -20;
        this.r = 3 + Math.random() * 5;
        this.color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
        this.alpha = 0.15 + Math.random() * 0.35;
        this.vy = 0.4 + Math.random() * 0.8;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.04;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.02 + Math.random() * 0.02;
      }
      update() {
        this.y += this.vy;
        this.wobble += this.wobbleSpeed;
        this.x += this.vx + Math.sin(this.wobble) * 0.5;
        this.angle += this.spin;
        if (this.y > H + 20) this.reset();
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // teardrop petal shape
        ctx.moveTo(0, -this.r);
        ctx.bezierCurveTo(this.r * 0.8, -this.r * 0.5, this.r * 0.8, this.r * 0.5, 0, this.r);
        ctx.bezierCurveTo(-this.r * 0.8, this.r * 0.5, -this.r * 0.8, -this.r * 0.5, 0, -this.r);
        ctx.fill();
        ctx.restore();
      }
    }

    const petals = Array.from({ length: 38 }, () => new Petal());

    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      petals.forEach(p => { p.update(); p.draw(); });
      animId = requestAnimationFrame(loop);
    };
    loop();

    const onResize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 2,
      }}
    />
  );
}

// ─── Word-by-word clip-path reveal ──────────────────────────────────────────
function AnimatedHeadline() {
  const line1 = ["Find", "the", "perfect", "vendor"];
  const line2 = ["for", "your", "wedding", "&", "events"];

  return (
    <h1
      className="font-display font-extrabold text-white mb-4 leading-tight hero-headline"
      style={{
        fontSize: "clamp(1.9rem, 5vw, 3.2rem)",
        letterSpacing: "-0.02em",
        textShadow: "0 2px 16px rgba(0,0,0,0.3)",
      }}
    >
      <span className="block">
        {line1.map((w, i) => (
          <span
            key={w + i}
            className="inline-block word-reveal"
            style={{ animationDelay: `${0.3 + i * 0.12}s` }}
          >
            {w}&nbsp;
          </span>
        ))}
      </span>
      <span className="block">
        {line2.map((w, i) => (
          <span
            key={w + i}
            className="inline-block word-reveal"
            style={{
              animationDelay: `${0.3 + (line1.length + i) * 0.12}s`,
              color: w === "wedding" ? "#f5a623" : undefined,
            }}
          >
            {w}&nbsp;
          </span>
        ))}
      </span>
    </h1>
  );
}

// ─── Tilt card ───────────────────────────────────────────────────────────────
function TiltCard({ children, className, style }) {
  const ref = useRef(null);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    el.style.transform = `perspective(600px) rotateY(${dx * 6}deg) rotateX(${-dy * 6}deg) translateY(-3px)`;
    el.style.boxShadow = `${-dx * 6}px ${-dy * 6}px 24px rgba(0,0,0,0.12)`;
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.style.boxShadow = "";
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}

// ─── Inline autocomplete search bar ─────────────────────────────────────────
function HeroSearchBar() {
  const [q, setQ]       = useState("");
  const [city, setCity] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const navigate        = useNavigate();
  const wrapRef         = useRef(null);

  useEffect(() => {
    const fn = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    if (q.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      api.get("/autocomplete", { params: { q } })
        .then(({ data }) => { setSuggestions(data.data || []); setOpen(true); })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = () => {
    const params = new URLSearchParams();
    if (q)    params.set("q", q);
    if (city) params.set("city", city);
    navigate(`/search?${params.toString()}`);
    setOpen(false);
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full max-w-2xl mx-auto searchbar-enter"
      style={{ animationDelay: "0.9s" }}
    >
      {/* Glow ring */}
      <div
        className="absolute -inset-1 rounded-2xl transition-all duration-500 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #f5a623, #e8192c, #f5a623)",
          opacity: focused ? 0.6 : 0,
          filter: "blur(8px)",
          zIndex: 0,
        }}
      />

      <div
        className="relative flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden border"
        style={{
          borderColor: focused ? "#f5a623" : "rgba(255,255,255,0.6)",
          transition: "border-color 0.3s",
          zIndex: 1,
        }}
      >
        <div className="flex items-center flex-1 px-4 py-1 gap-2 min-w-0">
          <Search
            size={18}
            className="flex-shrink-0 transition-colors duration-300"
            style={{ color: focused ? "#e8192c" : "#9ca3af" }}
          />
          <input
            className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 py-3 min-w-0"
            placeholder="Marriage hall, photographer, caterer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            onFocus={() => { setFocused(true); suggestions.length && setOpen(true); }}
            onBlur={() => setFocused(false)}
          />
        </div>

        <div className="hidden sm:flex items-center border-l border-gray-200 px-4 py-1 gap-2 w-44">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input
            className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 py-3 min-w-0"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
        </div>

        <button
          onClick={go}
          className="search-btn flex-shrink-0 m-1.5 px-5 py-3 rounded-xl text-sm font-bold text-white relative overflow-hidden"
          style={{ background: "#e8192c" }}
        >
          <span className="relative z-10">Search</span>
          <span className="search-btn-ripple" />
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl py-2 dropdown-slide">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => { navigate(s.url); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between gap-3 suggestion-row"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <span className="text-gray-800 font-medium">{s.label}</span>
              <span className="text-gray-400 text-xs">{s.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function HeroSearch({ topCities = [] }) {
  return (
    <>
      {/* ── Keyframe injection ── */}
      <style>{`
        /* Reduce motion override */
        @media (prefers-reduced-motion: reduce) {
          .word-reveal, .searchbar-enter, .eyebrow-enter,
          .subtext-enter, .pills-enter, .trust-enter,
          .diff-card, canvas { animation: none !important; opacity: 1 !important; }
        }

        /* Word clip-path reveal */
        @keyframes wordReveal {
          0%   { clip-path: inset(0 100% 0 0); opacity: 0; transform: translateY(12px); }
          100% { clip-path: inset(0 0% 0 0);   opacity: 1; transform: translateY(0); }
        }
        .word-reveal {
          opacity: 0;
          animation: wordReveal 0.55s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        /* Eyebrow pill slide-down */
        @keyframes eyebrowIn {
          0%   { opacity: 0; transform: translateY(-16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .eyebrow-enter {
          opacity: 0;
          animation: eyebrowIn 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s forwards;
        }

        /* Sub-headline fade-up */
        @keyframes fadeUp {
          0%   { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .subtext-enter {
          opacity: 0;
          animation: fadeUp 0.65s cubic-bezier(0.22,1,0.36,1) 0.82s forwards;
        }

        /* Search bar scale-in */
        @keyframes searchIn {
          0%   { opacity: 0; transform: scale(0.94) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .searchbar-enter {
          opacity: 0;
          animation: searchIn 0.7s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        /* Pills wave-stagger */
        @keyframes pillIn {
          0%   { opacity: 0; transform: translateY(14px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .pill-item {
          opacity: 0;
          animation: pillIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        /* Trust row */
        @keyframes trustIn {
          0%   { opacity: 0; transform: translateX(-10px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .trust-item {
          opacity: 0;
          animation: trustIn 0.5s ease forwards;
        }

        /* Search button shimmer */
        @keyframes shimmer {
          0%   { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(250%) skewX(-15deg); }
        }
        .search-btn { transition: transform 0.15s, box-shadow 0.15s; }
        .search-btn:hover { transform: scale(1.04); box-shadow: 0 6px 20px rgba(232,25,44,0.45); }
        .search-btn:active { transform: scale(0.97); }
        .search-btn-ripple {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
          transform: translateX(-100%) skewX(-15deg);
        }
        .search-btn:hover .search-btn-ripple {
          animation: shimmer 0.7s ease forwards;
        }

        /* Dropdown slide */
        @keyframes dropdownSlide {
          0%   { opacity: 0; transform: translateY(-6px) scaleY(0.97); }
          100% { opacity: 1; transform: translateY(0) scaleY(1); }
        }
        .dropdown-slide {
          animation: dropdownSlide 0.22s cubic-bezier(0.22,1,0.36,1);
          transform-origin: top;
        }

        /* Suggestion row */
        @keyframes suggestionRow {
          0%   { opacity: 0; transform: translateX(-8px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .suggestion-row {
          opacity: 0;
          animation: suggestionRow 0.25s ease forwards;
        }

        /* Differentiator cards */
        @keyframes diffCardIn {
          0%   { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .diff-card {
          opacity: 0;
          animation: diffCardIn 0.6s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        /* Icon pulse on card hover */
        .diff-icon-wrap { transition: transform 0.2s; }
        .diff-card-link:hover .diff-icon-wrap { transform: scale(1.15) rotate(-4deg); }

        /* Background Ken Burns */
        @keyframes kenBurns {
          0%   { transform: scale(1)    translate(0, 0); }
          50%  { transform: scale(1.06) translate(-1%, 0.5%); }
          100% { transform: scale(1)    translate(0, 0); }
        }
        .hero-bg-img { animation: kenBurns 18s ease-in-out infinite; }

        /* Overlay pulse */
        @keyframes overlayBreath {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.85; }
        }
        .hero-overlay { animation: overlayBreath 8s ease-in-out infinite; }
      `}</style>

      <section className="relative overflow-hidden" style={{ minHeight: 520 }}>

        {/* ── Background ── */}
        {heroBg ? (
          <>
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="hero-bg-img absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${heroBg})` }}
              />
            </div>
            <div
              className="hero-overlay absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(26,32,53,0.82) 0%, rgba(26,32,53,0.65) 55%, rgba(255,255,255,0.0) 100%)",
              }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg,#1a2035 0%,#2d3a5e 50%,#1a2035 100%)" }}
          />
        )}

        {/* ── Floating Petals ── */}
        <PetalCanvas />

        {/* Light bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-28"
          style={{ background: "linear-gradient(to top, #f9fafb, transparent)", zIndex: 3 }}
        />

        {/* ── Content ── */}
        <div className="relative max-w-4xl mx-auto px-4 pt-16 pb-24 text-center" style={{ zIndex: 4 }}>

          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-2 mb-5 eyebrow-enter">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-white bg-white/10 border border-white/20 px-4 py-1.5 rounded-full backdrop-blur-sm">
              <Star size={11} className="fill-gold-400 text-gold-400" />
              Wedding &amp; Event Vendors - Verified
            </span>
          </div>

          {/* Animated headline */}
          <AnimatedHeadline />

          {/* Sub-headline */}
          <p className="text-white/80 text-sm md:text-base max-w-xl mx-auto mb-8 leading-relaxed subtext-enter">
            Search, compare and directly contact verified marriage halls, decorators,
            caterers, photographers and every other vendor - no middleman, no commission.
          </p>

          {/* Search bar */}
          <HeroSearchBar />

          {/* Popular category pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {POPULAR_SEARCHES.map((c, i) => (
              <Link
                key={c.slug}
                to={`/search?category=${c.slug}`}
                className="pill-item text-xs font-medium text-white/90 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm"
                style={{
                  animationDelay: `${1.1 + i * 0.07}s`,
                  transition: "background 0.2s, transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "";
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                {c.label}
              </Link>
            ))}
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-5 mt-6">
            {TRUST.map(({ icon: Icon, text }, i) => (
              <span
                key={text}
                className="trust-item flex items-center gap-1.5 text-xs text-white/70"
                style={{ animationDelay: `${1.5 + i * 0.12}s` }}
              >
                <Icon size={13} style={{ color: "#f5a623" }} />
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* ── Differentiator strip ── */}
        <div className="relative z-10" style={{ background: "white" }}>
          <div style={{ lineHeight: 0, marginTop: -2 }}>
            <svg
              viewBox="0 0 1440 40"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              className="w-full block h-10"
            >
              <path d="M0,0 C480,40 960,40 1440,0 L1440,40 L0,40 Z" fill="white" />
            </svg>
          </div>

          <div className="max-w-5xl mx-auto px-4 pb-8 -mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: Globe,
                  color: "#e8192c",
                  title: "Free Vendor Website",
                  desc: "Every vendor gets their own website with gallery, services & contact - live in minutes.",
                  to: "/website-builder",
                  cta: "See how →",
                  delay: "1.7s",
                },
                {
                  icon: CalendarCheck,
                  color: "#1a2035",
                  title: "Live Booking Calendar",
                  desc: "See which dates a vendor has free - no back-and-forth calls needed.",
                  to: "/search",
                  cta: "Browse vendors →",
                  delay: "1.85s",
                },
                {
                  icon: MessageCircle,
                  color: "#e8192c",
                  title: "Direct WhatsApp Contact",
                  desc: "Inquire directly to the vendor's WhatsApp. Zero commission. Zero middlemen.",
                  to: "/for-vendors",
                  cta: "List your business →",
                  delay: "2.0s",
                },
              ].map(({ icon: Icon, color, title, desc, to, cta, delay }) => (
                <TiltCard
                  key={title}
                  className="diff-card diff-card-link flex gap-3 bg-white border border-gray-100 rounded-xl p-4 shadow-sm cursor-pointer"
                  style={{ animationDelay: delay }}
                >
                  <Link to={to} className="flex gap-3 w-full">
                    <div
                      className="diff-icon-wrap w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: color + "12" }}
                    >
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900 text-sm mb-0.5">{title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed mb-1">{desc}</p>
                      <span
                        className="text-xs font-semibold"
                        style={{ color, textDecoration: "none", transition: "text-decoration 0.2s" }}
                      >
                        {cta}
                      </span>
                    </div>
                  </Link>
                </TiltCard>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}