import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, Search, Dumbbell, BookOpen, UtensilsCrossed, Store,
  HeartPulse, Scissors, GraduationCap, PartyPopper, CheckCircle2, MessageCircle, Receipt,
} from "lucide-react";
import CitySelect from "../../common/CitySelect";
import { Floaty, Plus, Ring, Squiggle, DotGrid, Triangle } from "./art";
import { USE_3D_ICONS } from "./assets";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";
const EASE = [0.22, 1, 0.36, 1];

// Search uses keywords (not category slugs) so the tiles work for every city
// and every admin-managed category.
const TILES = [
  { key: "gym", label: "Gym & Fitness", q: "gym", icon: Dumbbell, bg: "#FFE6D6", fg: "#e8192c" },
  { key: "library", label: "Library", q: "library", icon: BookOpen, bg: "#DDF3E8", fg: "#0f8a5f" },
  { key: "shop", label: "Shops", q: "shop", icon: Store, bg: "#FFE0E3", fg: "#e8192c" },
  { key: "food", label: "Restaurants", q: "restaurant", icon: UtensilsCrossed, bg: "#FFF0C2", fg: "#d38a10" },
  { key: "events", label: "Events", q: "event", icon: PartyPopper, bg: "#E0EAFF", fg: "#3a5bd9" },
];

function Tile({ t, i, reduce }) {
  const Icon = t.icon;
  const [imgFailed, setImgFailed] = useState(false);
  const show3d = USE_3D_ICONS && !imgFailed;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}
    >
      <Link
        to={`/search?q=${encodeURIComponent(t.q)}`}
        className="group relative block rounded-[1.6rem] pt-11 pb-4 px-2 mt-9 text-center transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_30px_-18px_rgba(26,32,53,0.45)]"
        style={{ background: t.bg }}
      >
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 w-[72px] h-[72px] flex items-center justify-center transition duration-300 group-hover:scale-110 group-hover:-rotate-6">
          {show3d ? (
            <img
              src={`/3d/${t.key}.png`}
              alt=""
              width="72"
              height="72"
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="w-[72px] h-[72px] object-contain drop-shadow-[0_10px_8px_rgba(26,32,53,0.25)]"
            />
          ) : (
            <span className="w-16 h-16 rounded-full bg-white shadow-[0_10px_20px_-8px_rgba(26,32,53,0.35)] flex items-center justify-center">
              <Icon size={28} strokeWidth={2.2} style={{ color: t.fg }} />
            </span>
          )}
        </span>
        <span className="text-[11px] md:text-xs font-extrabold tracking-wide uppercase text-navy-600">{t.label}</span>
      </Link>
    </motion.div>
  );
}

function SampleCard({ className, rotate, delay, children }) {
  return (
    <Floaty className={`hidden xl:block absolute ${className}`} rotate={rotate} delay={delay}>
      <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_20px_40px_-20px_rgba(26,32,53,0.45)] border border-navy-50">
        {children}
      </div>
    </Floaty>
  );
}

export default function HeroSection() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  const go = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city) params.set("city", city);
    navigate(`/search?${params.toString()}`);
  };

  const rise = (delay) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 26 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } };

  const pop = (delay, rot) =>
    reduce
      ? { style: { transform: `rotate(${rot}deg)` } }
      : {
          initial: { opacity: 0, scale: 0.7, rotate: 0 },
          animate: { opacity: 1, scale: 1, rotate: rot },
          transition: { type: "spring", stiffness: 180, damping: 14, delay },
        };

  return (
    <section className="relative overflow-hidden bg-[#FFF6E8]">
      {/* decorative shapes */}
      <Floaty className="absolute left-[6%] top-16 hidden md:block" delay={0.4}><Plus size={30} color="#f5a623" /></Floaty>
      <Floaty className="absolute right-[7%] top-24 hidden md:block" delay={1.2}><Ring size={46} color="#e8192c" /></Floaty>
      <Floaty className="absolute left-[13%] top-[34%] hidden lg:block" delay={0.8}><Triangle size={34} color="#1a2035" /></Floaty>
      <Floaty className="absolute right-[11%] bottom-72 hidden lg:block" delay={0.2}><Squiggle width={96} color="#1a2035" /></Floaty>
      <div className="absolute right-4 top-1/2 hidden xl:block"><DotGrid /></div>

      {/* sample product cards, purely illustrative */}
      <SampleCard className="left-[2%] top-[40%]" rotate={-6} delay={0.3}>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center"><CheckCircle2 size={18} className="text-white" /></span>
          <div><p className="text-xs font-extrabold text-navy-700">Fee received</p><p className="text-[11px] text-navy-400">Sample · Monthly plan</p></div>
        </div>
      </SampleCard>
      <SampleCard className="left-[4%] top-[56%]" rotate={5} delay={0.9}>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gold-500 flex items-center justify-center"><Receipt size={17} className="text-navy-700" /></span>
          <div><p className="text-xs font-extrabold text-navy-700">Receipt sent</p><p className="text-[11px] text-navy-400">Sample · on WhatsApp</p></div>
        </div>
      </SampleCard>
      <SampleCard className="right-[2%] top-[42%]" rotate={6} delay={0.6}>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center"><MessageCircle size={18} className="text-white" /></span>
          <div><p className="text-xs font-extrabold text-navy-700">New enquiry</p><p className="text-[11px] text-navy-400">Sample · from your listing</p></div>
        </div>
      </SampleCard>

      <div className="relative max-w-6xl mx-auto px-4 pt-14 md:pt-20 text-center">
        <motion.p
          {...rise(0)}
          className="inline-flex items-center gap-2 text-xs font-bold text-navy-600 bg-white rounded-full px-4 py-2 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-accent-500" />
          For gyms, libraries, restaurants, shops, clinics and more
        </motion.p>

        <h1
          className="font-display font-extrabold text-navy-700 mt-6 flex flex-col md:flex-row md:flex-wrap items-center justify-center gap-x-4 gap-y-3"
          style={{ fontSize: "clamp(2.7rem, 7.4vw, 5.6rem)", letterSpacing: "-0.035em", lineHeight: 1 }}
        >
          <motion.span {...rise(0.1)} className="inline-block">Run it.</motion.span>
          <motion.span {...pop(0.3, -3)} className="inline-block bg-accent-500 text-white rounded-2xl px-5 pb-1.5 pt-0.5 shadow-[0_14px_0_-6px_#9e0f1b]">
            Get it.
          </motion.span>
          <motion.span {...pop(0.45, 2.5)} className="inline-block bg-gold-500 text-navy-700 rounded-2xl px-5 pb-1.5 pt-0.5 shadow-[0_14px_0_-6px_#d38a10]">
            Found it.
          </motion.span>
          <span className="sr-only"> Manage, promote and grow your local business with In2Fest</span>
        </h1>

        <motion.p {...rise(0.55)} className="mt-8 text-base md:text-xl text-navy-500 max-w-2xl mx-auto leading-relaxed">
          Run your business with simple software. Get your own website. Get found by customers near you,
          and let them message you directly on WhatsApp.
        </motion.p>

        <motion.div {...rise(0.65)} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`${APP_URL}/login`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 hover:bg-accent-600 active:scale-[0.97] transition px-8 py-4 text-sm font-extrabold text-white shadow-[0_14px_30px_-12px_rgba(232,25,44,0.7)]"
          >
            Start free <ArrowRight size={16} />
          </a>
          <Link
            to="/get-website"
            className="inline-flex items-center justify-center rounded-full border-2 border-navy-700 hover:bg-navy-700 hover:text-white transition px-8 py-4 text-sm font-extrabold text-navy-700"
          >
            See the website you get
          </Link>
        </motion.div>

        {/* Customer search */}
        <motion.form
          {...rise(0.75)}
          onSubmit={go}
          role="search"
          className="mt-12 mx-auto max-w-3xl flex items-center bg-white rounded-full pl-5 pr-2 py-2 shadow-[0_24px_50px_-24px_rgba(26,32,53,0.5)] border-2 border-transparent focus-within:border-gold-500 transition"
        >
          <Search size={20} className="text-navy-300 flex-shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Looking for a gym, library, clinic, shop…"
            aria-label="Search for a business"
            className="flex-1 min-w-0 px-3 py-3 text-sm md:text-base text-navy-700 placeholder-navy-300 outline-none bg-transparent"
          />
          <div className="hidden sm:block w-40 border-l border-navy-100 pl-3">
            <CitySelect variant="inline" value={city} onChange={setCity} placeholder="City" />
          </div>
          <button type="submit" className="rounded-full bg-navy-700 hover:bg-navy-800 transition px-6 md:px-8 py-3.5 text-sm font-extrabold text-white">
            Search
          </button>
        </motion.form>

        <div className="mt-6 pb-16 md:pb-24">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-navy-400">Or browse by category</p>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-5 gap-x-3 gap-y-1">
            {TILES.map((t, i) => <Tile key={t.key} t={t} i={i} reduce={reduce} />)}
          </div>
          <Link to="/categories" className="inline-flex items-center gap-1.5 mt-7 text-sm font-extrabold text-accent-500 hover:underline">
            See all categories <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}