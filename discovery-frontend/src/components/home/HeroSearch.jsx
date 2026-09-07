import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShieldCheck, MessageCircle, Star, ChevronRight, Globe, CalendarCheck } from "lucide-react";
import { CATEGORIES, BRAND_NAME } from "../../lib/constants";
import api from "../../lib/api";
import CitySelect from "../common/CitySelect";
import CityLaunchBadge from "./CityLaunchBadge";

// ─── AI image prompt (for you to generate) ───────────────────────────────────
// Prompt: "Elegant Indian wedding celebration, warm golden hour lighting,
//  marigold flower decorations, couple surrounded by family, mandap stage
//  with draping and lights in background, cinematic wide shot,
//  professional event photography style, soft bokeh, vibrant colors,
//  no text overlays"  - generate at 1920x800px, save as hero.png in
//  discovery-frontend/src/assets/hero.png

// Try to load the background  - gracefully absent until you add the file
let heroBg = null;
try { heroBg = new URL("../../assets/hero.png", import.meta.url).href; } catch {}

const POPULAR_SEARCHES = [
  { label: "Marriage Hall",    slug: "marriage-hall" },
  { label: "Photographer",     slug: "photographer" },
  { label: "Decorator",        slug: "decorator" },
  { label: "Caterer",          slug: "caterer" },
  { label: "DJ",               slug: "dj" },
  { label: "Makeup Artist",    slug: "makeup-artist" },
];

const TRUST = [
  { icon: ShieldCheck,    text: "Verified vendors" },
  { icon: MessageCircle,  text: "Direct WhatsApp contact" },
  { icon: Star,           text: "Real reviews" },
];

// ─── Inline autocomplete search bar ─────────────────────────────────────────
function HeroSearchBar() {
  const [q, setQ]           = useState("");
  const [city, setCity]     = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]     = useState(false);
  const navigate            = useNavigate();
  const wrapRef             = useRef(null);

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
    <div ref={wrapRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search pill */}
      <div className="flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/60">
        {/* Query input */}
        <div className="flex items-center flex-1 px-4 py-1 gap-2 min-w-0">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 py-3 min-w-0"
            placeholder="Marriage hall, photographer, caterer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            onFocus={() => suggestions.length && setOpen(true)}
          />
        </div>
        {/* City divider + select */}
        <div className="hidden sm:flex items-center border-l border-gray-200 px-4 py-1 w-48">
          <CitySelect variant="inline" value={city} onChange={setCity} placeholder="City" />
        </div>
        {/* Search button */}
        <button
          onClick={go}
          className="flex-shrink-0 m-1.5 px-5 py-3 rounded-xl text-sm font-bold text-white transition-colors"
          style={{ background: "#e8192c" }}
        >
          Search
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl py-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => { navigate(s.url); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between gap-3"
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
    <section className="relative overflow-hidden" style={{ minHeight: 520 }}>

      {/* ── Background image with dark overlay ── */}
      {heroBg ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
          {/* Gradient overlay  - darker at top for text legibility, fades to white at bottom */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(26,32,53,0.82) 0%, rgba(26,32,53,0.65) 55%, rgba(255,255,255,0.0) 100%)"
            }}
          />
        </>
      ) : (
        /* Fallback gradient when no image yet */
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg,#1a2035 0%,#2d3a5e 50%,#1a2035 100%)"
          }}
        />
      )}

      {/* Light bottom fade to page bg */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28"
        style={{ background: "linear-gradient(to top, #f9fafb, transparent)" }}
      />

      {/* ── Content ── */}
      <div className="relative max-w-4xl mx-auto px-4 pt-16 pb-24 text-center">

        {/* Eyebrow pill */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-white bg-white/10 border border-white/20 px-4 py-1.5 rounded-full backdrop-blur-sm"
          >
            <Star size={11} className="fill-gold-400 text-gold-400" />
            Wedding &amp; Event Vendors  - Verified
          </span>
        </div>

        {/* City launch badge */}
        <div className="flex justify-center mb-5">
          <CityLaunchBadge />
        </div>

        {/* Headline */}
        <h1
          className="font-display font-extrabold text-white mb-4 leading-tight"
          style={{ fontSize: "clamp(1.9rem, 5vw, 3.2rem)", letterSpacing: "-0.02em", textShadow: "0 2px 16px rgba(0,0,0,0.3)" }}
        >
          Find the perfect vendor<br className="hidden md:block" />
          for your <span style={{ color: "#f5a623" }}>wedding</span> &amp; events
        </h1>

        {/* Sub-headline */}
        <p className="text-white/80 text-sm md:text-base max-w-xl mx-auto mb-8 leading-relaxed">
          Search, compare and directly contact verified marriage halls, decorators,
          caterers, photographers and every other vendor  - no middleman, no commission.
        </p>

        {/* Search bar */}
        <HeroSearchBar />

        {/* Popular category pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {POPULAR_SEARCHES.map((c) => (
            <Link
              key={c.slug}
              to={`/search?category=${c.slug}`}
              className="text-xs font-medium text-white/90 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/25 transition-colors backdrop-blur-sm"
            >
              {c.label}
            </Link>
          ))}
        </div>

        {/* Trust row */}
        <div className="flex flex-wrap items-center justify-center gap-5 mt-6">
          {TRUST.map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1.5 text-xs text-white/70">
              <Icon size={13} style={{ color: "#f5a623" }} />
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* ── Differentiator strip  - shown just below hero ── */}
      <div
        className="relative z-10"
        style={{ background: "white" }}
      >
        {/* Wave separator */}
        <div style={{ lineHeight: 0, marginTop: -2 }}>
          <svg viewBox="0 0 1440 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full block h-10">
            <path d="M0,0 C480,40 960,40 1440,0 L1440,40 L0,40 Z" fill="white" />
          </svg>
        </div>

        {/* What makes us different  - 3 quick callouts */}
        <div className="max-w-5xl mx-auto px-4 pb-8 -mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: Globe,
                color: "#e8192c",
                title: "Free Vendor Website",
                desc:  "Every vendor gets their own website with gallery, services & contact  - live in minutes.",
                to:    "/get-website",
                cta:   "See how →"
              },
              {
                icon: CalendarCheck,
                color: "#1a2035",
                title: "Live Booking Calendar",
                desc:  "See which dates a vendor has free  - no back-and-forth calls needed.",
                to:    "/search",
                cta:   "Browse vendors →"
              },
              {
                icon: MessageCircle,
                color: "#e8192c",
                title: "Direct WhatsApp Contact",
                desc:  "Inquire directly to the vendor's WhatsApp. Zero commission. Zero middlemen.",
                to:    "/for-vendors",
                cta:   "List your business →"
              },
            ].map(({ icon: Icon, color, title, desc, to, cta }) => (
              <Link
                key={title}
                to={to}
                className="group flex gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: color + "12" }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900 text-sm mb-0.5">{title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mb-1">{desc}</p>
                  <span className="text-xs font-semibold group-hover:underline" style={{ color }}>{cta}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}