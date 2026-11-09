import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, Check, Plus as PlusIcon, Minus, LayoutDashboard, Globe, MapPin,
  CheckCircle2, MessageCircle, Star, BadgeCheck, Search,
} from "lucide-react";
import { BASE_DOMAIN, BRAND_NAME } from "../../lib/constants";

export const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";
export const EASE = [0.22, 1, 0.36, 1];

/* ── The three pillars ───────────────────────────────────────────────── */
export const PILLARS = [
  {
    key: "run", word: "Run it.", short: "Manage your whole business in one app.", path: "/for-vendors/run-it",
    icon: LayoutDashboard, bg: "#1a2035", fg: "#ffffff", soft: "rgba(255,255,255,.78)", chip: "rgba(255,255,255,.14)",
    shadow: "#0b0e1c", tint: "#E0EAFF",
  },
  {
    key: "get", word: "Get it.", short: "A website of your own, live within a day.", path: "/for-vendors/get-it",
    icon: Globe, bg: "#e8192c", fg: "#ffffff", soft: "rgba(255,255,255,.88)", chip: "rgba(255,255,255,.18)",
    shadow: "#9e0f1b", tint: "#FFE0E3",
  },
  {
    key: "found", word: "Found it.", short: "A verified listing that customers can find.", path: "/for-vendors/found-it",
    icon: MapPin, bg: "#f5a623", fg: "#1a2035", soft: "rgba(26,32,53,.8)", chip: "rgba(26,32,53,.12)",
    shadow: "#b97800", tint: "#FFF0C2",
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
export function Reveal({ children, delay = 0, y = 26, className = "" }) {
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

export function Floaty({ children, className = "", delay = 0 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -12, 0], rotate: [0, 3, 0] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

export function Arches({ className = "", width = 260, colors = ["#f5a623", "#e8192c", "#ffffff"] }) {
  return (
    <svg className={className} width={width} height={width / 2} viewBox="0 0 220 110" aria-hidden="true">
      <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke={colors[0]} strokeWidth="18" strokeLinecap="round" />
      <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke={colors[1]} strokeWidth="18" strokeLinecap="round" />
      <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke={colors[2]} strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

export function Head({ eyebrow, title, sub }) {
  return (
    <Reveal className="text-center max-w-2xl mx-auto">
      <p className="text-xs font-extrabold tracking-[0.18em] uppercase text-gold-600 mb-3">{eyebrow}</p>
      <h2
        className="font-display font-extrabold text-navy-700"
        style={{ fontSize: "clamp(1.8rem, 4.2vw, 2.9rem)", letterSpacing: "-0.025em", lineHeight: 1.08 }}
      >
        {title}
      </h2>
      {sub && <p className="mt-4 text-base md:text-lg text-navy-400 leading-relaxed">{sub}</p>}
    </Reveal>
  );
}

export const stickerRed =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 text-white font-extrabold " +
  "shadow-[0_5px_0_0_#9e0f1b] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_7px_0_0_#9e0f1b] " +
  "active:translate-y-1 active:shadow-none";

/* Button that works for internal routes (to) and external links (href) */
export function Cta({ to, href, variant = "red", children, className = "" }) {
  const styles = {
    red: `${stickerRed} px-8 py-4 text-sm`,
    navy: "inline-flex items-center justify-center gap-2 rounded-full border-2 border-navy-700 text-navy-700 hover:bg-navy-700 hover:text-white transition px-8 py-4 text-sm font-extrabold",
    light: "inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 text-white hover:border-white transition px-8 py-4 text-sm font-extrabold",
  };
  const cls = `${styles[variant]} ${className}`;
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <a href={href} className={cls}>{children}</a>;
}

/* ── Tabs to switch between the three pages ──────────────────────────── */
export function PillarTabs({ active = "all" }) {
  const items = [
    { key: "all", label: "Overview", path: "/for-vendors", dot: "#1a2035" },
    ...PILLARS.map((p) => ({ key: p.key, label: p.word.replace(".", ""), path: p.path, dot: p.bg })),
  ];
  return (
    <nav aria-label="What In2Fest gives vendors" className="flex justify-center">
      <ul className="inline-flex flex-wrap justify-center gap-1 rounded-full bg-white p-1.5 shadow-[0_8px_24px_-12px_rgba(26,32,53,0.35)]">
        {items.map((it) => {
          const on = it.key === active;
          return (
            <li key={it.key}>
              <Link
                to={it.path}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold transition-colors ${
                  on ? "bg-navy-700 text-white" : "text-navy-500 hover:bg-navy-50"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ background: it.dot }} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ── Marquee ─────────────────────────────────────────────────────────── */
export function Marquee({ words, bg = "#e8192c" }) {
  const reduce = useReducedMotion();
  const track = [...words, ...words].map((w, i) => (
    <span key={i} className="flex items-center gap-8 flex-shrink-0">
      <span className="font-display font-extrabold text-xl md:text-3xl text-white whitespace-nowrap">{w}</span>
      <span className="text-white/70 text-2xl" aria-hidden="true">✦</span>
    </span>
  ));
  return (
    <div className="bg-[#FFF6E8] py-6 overflow-hidden" aria-hidden="true">
      <div className="rotate-1 scale-[1.03] py-4 overflow-hidden" style={{ background: bg }}>
        {reduce ? (
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 px-4">{track}</div>
        ) : (
          <motion.div className="flex gap-8 w-max" animate={{ x: ["-50%", "0%"] }} transition={{ duration: 32, ease: "linear", repeat: Infinity }}>
            {track}{track}
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── Sample visuals (no real numbers, all labelled Sample) ───────────── */
export function RunVisual() {
  return (
    <div className="rounded-2xl bg-white p-4 text-navy-700 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-2.5 w-24 rounded bg-navy-700" />
          <div className="mt-1.5 h-2 w-16 rounded bg-navy-100" />
        </div>
        <span className="w-8 h-8 rounded-full bg-accent-500 text-white text-[10px] font-extrabold flex items-center justify-center">You</span>
      </div>
      <div className="mt-3 rounded-xl bg-navy-700 p-3.5">
        <p className="text-[10px] text-white/60">This month's collection</p>
        <div className="mt-1.5 h-4 w-28 rounded bg-white" />
        <div className="mt-2 h-2 w-14 rounded-full bg-emerald-400" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["Active members", "Pending dues", "New enquiries"].map((l, i) => (
          <div key={l} className="rounded-xl bg-[#F3F4F9] p-2.5">
            <p className="text-[9px] leading-tight text-navy-400">{l}</p>
            <div className={`mt-1.5 h-3 rounded ${i === 1 ? "bg-accent-500 w-7" : "bg-navy-700 w-9"}`} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-end gap-1.5 h-16">
        {[38, 52, 44, 66, 58, 82, 96].map((h, i) => (
          <motion.span
            key={i}
            className={`flex-1 rounded-md origin-bottom ${i === 6 ? "bg-gold-500" : "bg-emerald-500"}`}
            style={{ height: `${h}%` }}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 + i * 0.07, ease: EASE }}
          />
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {[0, 1].map((r) => (
          <div key={r} className="flex items-center gap-2 rounded-lg bg-[#F3F4F9] px-2.5 py-1.5">
            <span className="w-5 h-5 rounded-full bg-navy-100" />
            <div className="h-2 flex-1 rounded bg-navy-100" />
            <span className="rounded-full bg-gold-100 bg-[#FFF0C2] px-2 py-0.5 text-[9px] font-bold text-[#a8690a]">Renewal due</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-navy-300">Sample view</p>
    </div>
  );
}

export function GetVisual() {
  return (
    <div className="rounded-2xl bg-white overflow-hidden text-navy-700 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 bg-navy-50 px-3 py-2">
        <span className="flex gap-1"><i className="w-2 h-2 rounded-full bg-accent-500" /><i className="w-2 h-2 rounded-full bg-gold-500" /><i className="w-2 h-2 rounded-full bg-emerald-500" /></span>
        <span className="flex-1 truncate rounded-full bg-white px-3 py-0.5 text-[10px] text-navy-400">yourname.{BASE_DOMAIN}</span>
      </div>
      <div className="flex items-center justify-between bg-navy-700 px-4 py-2.5">
        <div className="h-2.5 w-14 rounded bg-white" />
        <div className="flex gap-2"><i className="h-1.5 w-7 rounded bg-white/50" /><i className="h-1.5 w-7 rounded bg-white/50" /><i className="h-1.5 w-7 rounded bg-white/50" /></div>
      </div>
      <div className="bg-navy-700 px-4 pb-6 pt-3">
        <div className="h-1.5 w-12 rounded bg-gold-500" />
        <div className="mt-2.5 h-4 w-40 rounded bg-white" />
        <div className="mt-1.5 h-4 w-28 rounded bg-accent-500" />
        <div className="mt-3 flex gap-2">
          <span className="rounded-full bg-accent-500 px-3 py-1 text-[9px] font-extrabold text-white">Enquire now</span>
          <span className="rounded-full border border-white/40 px-3 py-1 text-[9px] font-bold text-white">View plans</span>
        </div>
      </div>
      <div className="relative grid grid-cols-3 gap-2 p-3">
        {["#FFE6D6", "#DDF3E8", "#FFF0C2"].map((c) => (
          <div key={c} className="rounded-lg p-2" style={{ background: c }}>
            <div className="h-9 rounded bg-white/70" />
            <div className="mt-1.5 h-1.5 w-10 rounded bg-navy-700/70" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-3 pb-3">
        <p className="text-[10px] text-navy-300">Sample website</p>
        <span className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center"><MessageCircle size={15} className="text-white" /></span>
      </div>
    </div>
  );
}

export function FoundVisual() {
  const Card = ({ tint }) => (
    <div className="flex items-center gap-3 rounded-xl bg-[#F3F4F9] p-2.5">
      <span className="w-12 h-12 rounded-lg flex-shrink-0" style={{ background: tint }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-24 rounded bg-navy-700" />
          <BadgeCheck size={14} className="text-emerald-600 flex-shrink-0" />
        </div>
        <div className="mt-1.5 h-1.5 w-16 rounded bg-navy-200" />
        <div className="mt-1.5 flex gap-0.5">
          {[0, 1, 2, 3, 4].map((s) => <Star key={s} size={10} className="text-gold-500 fill-gold-500" />)}
        </div>
      </div>
      <span className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0"><MessageCircle size={13} className="text-white" /></span>
    </div>
  );
  return (
    <div className="rounded-2xl bg-white p-3 text-navy-700 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 rounded-full bg-[#F3F4F9] px-3 py-2">
        <Search size={13} className="text-navy-400" />
        <span className="text-[11px] text-navy-400">Gym in your city</span>
      </div>
      <div className="mt-3 rounded-xl bg-[#DDF3E8] h-24 relative overflow-hidden">
        <span className="absolute inset-x-0 top-1/2 h-2 bg-white/80" /><span className="absolute inset-y-0 left-1/3 w-2 bg-white/80" /><span className="absolute inset-y-0 right-1/4 w-1.5 bg-white/70" />
        <motion.span
          className="absolute left-1/2 top-3 -translate-x-1/2"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true"><path d="M13 33C5 23 1 19 1 13a12 12 0 0 1 24 0c0 6-4 10-12 20z" fill="#e8192c" /><circle cx="13" cy="13" r="4.5" fill="#fff" /></svg>
        </motion.span>
      </div>
      <div className="mt-3 space-y-2">
        <Card tint="#f5a623" />
        <Card tint="#FFE6D6" />
      </div>
      <p className="mt-2 text-[10px] text-navy-300">Sample listing</p>
    </div>
  );
}

/* ── Hero for each pillar page ───────────────────────────────────────── */
export function PillarHero({ pillar, active, title, mark, sub, primary, secondary, bullets = [], chips = [], visual, index }) {
  const reduce = useReducedMotion();
  const rise = (d) =>
    reduce ? {} : { initial: { opacity: 0, y: 26 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: d, ease: EASE } };
  const pop = (d, rot) =>
    reduce
      ? { style: { transform: `rotate(${rot}deg)` } }
      : {
          initial: { opacity: 0, scale: 0.7, rotate: 0 },
          animate: { opacity: 1, scale: 1, rotate: rot },
          transition: { type: "spring", stiffness: 180, damping: 14, delay: d },
        };

  return (
    <section className="relative overflow-hidden bg-[#FFF6E8]">
      <Floaty className="absolute left-[5%] top-28 hidden md:block" delay={0.3}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="11" width="6" height="28" rx="3" fill="#f5a623" /><rect y="11" width="28" height="6" rx="3" fill="#f5a623" /></svg>
      </Floaty>
      <Floaty className="absolute left-[46%] bottom-10 hidden lg:block" delay={1}>
        <svg width="36" height="36" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16.5" fill="none" stroke="#e8192c" strokeWidth="7" /></svg>
      </Floaty>

      <div className="relative max-w-6xl mx-auto px-4 pt-8 md:pt-10 pb-16 md:pb-24">
        <motion.div {...rise(0)}><PillarTabs active={active} /></motion.div>

        <div className="mt-10 md:mt-14 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <div className="text-center lg:text-left">
            <motion.p {...rise(0.05)} className="inline-flex items-center gap-2 text-xs font-bold text-navy-600 bg-white rounded-full px-4 py-2 shadow-sm">
              <span className="w-2 h-2 rounded-full" style={{ background: pillar.bg }} />
              {pillar.word} · Part {index} of 3 · {BRAND_NAME}
            </motion.p>

            <h1
              className="font-display font-extrabold text-navy-700 mt-5 flex flex-col items-center lg:items-start gap-y-3"
              style={{ fontSize: "clamp(2.2rem, 5.4vw, 4.2rem)", letterSpacing: "-0.035em", lineHeight: 1.04 }}
            >
              <motion.span {...rise(0.12)}>{title}</motion.span>
              <motion.span
                {...pop(0.3, -2)}
                className="inline-block rounded-2xl px-5 pb-1.5 pt-0.5"
                style={{ background: pillar.bg, color: pillar.fg, boxShadow: `0 12px 0 -6px ${pillar.shadow}`, ...(reduce ? { transform: "rotate(-2deg)" } : {}) }}
              >
                {mark}
              </motion.span>
            </h1>

            <motion.p {...rise(0.45)} className="mt-7 text-base md:text-lg text-navy-500 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {sub}
            </motion.p>

            <motion.div {...rise(0.58)} className="mt-7 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Cta {...primary} variant="red">{primary.label} <ArrowRight size={16} /></Cta>
              {secondary && <Cta {...secondary} variant="navy">{secondary.label}</Cta>}
            </motion.div>

            <motion.ul {...rise(0.7)} className="mt-7 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2">
              {bullets.map((t) => (
                <li key={t} className="flex items-center gap-1.5 text-sm font-semibold text-navy-500">
                  <CheckCircle2 size={16} className="text-emerald-600" /> {t}
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.div
            className="relative mx-auto w-full max-w-md"
            {...(reduce ? {} : { initial: { opacity: 0, y: 30, rotate: 2 }, animate: { opacity: 1, y: 0, rotate: 0 }, transition: { duration: 0.8, delay: 0.3, ease: EASE } })}
          >
            <div className="rounded-[2.5rem] p-5 sm:p-7 shadow-[0_40px_70px_-40px_rgba(26,32,53,0.7)]" style={{ background: pillar.bg }}>
              {visual}
            </div>
            {chips[0] && (
              <Floaty className="absolute -left-4 sm:-left-10 top-10 hidden sm:block" delay={0.4}>
                <ChipCard {...chips[0]} rotate="-rotate-6" />
              </Floaty>
            )}
            {chips[1] && (
              <Floaty className="absolute -right-3 sm:-right-8 bottom-12 hidden sm:block" delay={1.1}>
                <ChipCard {...chips[1]} rotate="rotate-6" />
              </Floaty>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ChipCard({ icon: Icon, bg, color = "#1a2035", title, sub, rotate }) {
  return (
    <div className={`${rotate} rounded-2xl bg-white px-4 py-3 shadow-[0_20px_40px_-20px_rgba(26,32,53,0.55)] flex items-center gap-3`}>
      <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: bg }}><Icon size={18} style={{ color }} /></span>
      <div><p className="text-xs font-extrabold text-navy-700">{title}</p><p className="text-[11px] text-navy-400">{sub}</p></div>
    </div>
  );
}

/* ── Feature grid ────────────────────────────────────────────────────── */
export function FeatureGrid({ eyebrow, title, sub, items, who }) {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <Head eyebrow={eyebrow} title={title} sub={sub} />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([Icon, t, d, tint], i) => (
            <Reveal key={t} delay={(i % 3) * 0.07}>
              <div className="h-full rounded-3xl bg-white border-2 border-navy-50 p-6 transition duration-300 hover:-translate-y-1.5 hover:border-navy-700 hover:shadow-[0_20px_40px_-24px_rgba(26,32,53,0.5)]">
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tint }}>
                  <Icon size={22} className="text-navy-700" />
                </span>
                <h3 className="mt-5 font-display font-extrabold text-navy-700 text-base">{t}</h3>
                <p className="mt-2 text-sm text-navy-400 leading-relaxed">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        {who && (
          <Reveal className="mt-10 text-center">
            <p className="text-xs font-extrabold tracking-[0.18em] uppercase text-navy-300 mb-4">{who.label}</p>
            <ul className="flex flex-wrap justify-center gap-2.5">
              {who.items.map((w) => (
                <li key={w} className="flex items-center gap-1.5 rounded-full bg-[#FFF6E8] px-4 py-2 text-sm font-bold text-navy-600">
                  <Check size={14} strokeWidth={3} className="text-emerald-600" /> {w}
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ── Steps ───────────────────────────────────────────────────────────── */
export function StepsRow({ eyebrow, title, sub, steps }) {
  const reduce = useReducedMotion();
  return (
    <section className="bg-[#FFF6E8] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <Head eyebrow={eyebrow} title={title} sub={sub} />
        <div className="relative mt-14 grid gap-x-5 gap-y-10 md:grid-cols-4">
          <motion.span
            aria-hidden="true"
            className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-1 rounded-full bg-gradient-to-r from-gold-500 via-accent-500 to-navy-700 origin-left"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.2, ease: EASE }}
          />
          {steps.map(([Icon, t, d], i) => (
            <Reveal key={t} delay={i * 0.12}>
              <div className="relative text-center">
                <span className="relative z-10 mx-auto mb-5 w-16 h-16 rounded-2xl bg-navy-700 text-gold-500 flex items-center justify-center shadow-[0_10px_0_-4px_#0b0e1c]">
                  <Icon size={26} />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent-500 text-white text-xs font-extrabold flex items-center justify-center">{i + 1}</span>
                </span>
                <h3 className="font-display font-extrabold text-lg text-navy-700">{t}</h3>
                <p className="mt-2 text-sm text-navy-400 leading-relaxed max-w-[16rem] mx-auto">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Links to the other pillars ──────────────────────────────────────── */
export function CrossLinks({ active }) {
  const others = PILLARS.filter((p) => p.key !== active);
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-4">
        <Head eyebrow="One account, three parts" title="See the other two parts of In2Fest." />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {others.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.key} delay={i * 0.1}>
                <Link
                  to={p.path}
                  className="group relative block h-full overflow-hidden rounded-[2rem] p-7 transition duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-30px_rgba(26,32,53,0.6)]"
                  style={{ background: p.bg, color: p.fg }}
                >
                  <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: p.chip }}><Icon size={22} /></span>
                  <h3 className="mt-5 font-display font-extrabold" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", letterSpacing: "-0.04em", lineHeight: 1 }}>{p.word}</h3>
                  <p className="mt-2 text-base font-semibold" style={{ color: p.soft }}>{p.short}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold">
                    Explore {p.word.replace(".", "")} <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1.5" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────── */
export function FaqSection({ items, title = "Good to know before you start." }) {
  const [open, setOpen] = useState(0);
  const reduce = useReducedMotion();
  return (
    <section className="bg-[#FFF6E8] py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4">
        <Head eyebrow="Questions" title={title} />
        <div className="mt-10 space-y-3">
          {items.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <Reveal key={q} delay={i * 0.05}>
                <div className={`rounded-2xl border-2 bg-white transition-colors ${isOpen ? "border-navy-700" : "border-navy-100"}`}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
                  >
                    <span className="font-bold text-navy-700 text-[15px]">{q}</span>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isOpen ? "bg-accent-500 text-white" : "bg-navy-50 text-navy-500"}`}>
                      {isOpen ? <Minus size={15} /> : <PlusIcon size={15} />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm text-navy-500 leading-relaxed">{a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ───────────────────────────────────────────────────────── */
export function FinalBand({ title, accent, sub, primary, secondary }) {
  return (
    <section className="relative overflow-hidden bg-navy-700 py-20 md:py-28">
      <Arches className="absolute -left-16 -bottom-10 hidden md:block" width={340} />
      <Arches className="absolute -right-16 -bottom-10 hidden md:block" width={340} />
      <Floaty className="absolute left-[18%] top-12 hidden md:block">
        <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true"><rect x="11" width="6" height="28" rx="3" fill="#f5a623" /><rect y="11" width="28" height="6" rx="3" fill="#f5a623" /></svg>
      </Floaty>
      <Reveal className="relative max-w-3xl mx-auto px-4 text-center">
        <h2 className="font-display font-extrabold text-white" style={{ fontSize: "clamp(2.1rem, 6vw, 3.8rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          {title} <span className="text-gold-500">{accent}</span>
        </h2>
        <p className="mt-5 text-white/75 text-base md:text-lg">{sub}</p>
        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Cta {...primary} variant="red">{primary.label} <ArrowRight size={16} /></Cta>
          {secondary && <Cta {...secondary} variant="light">{secondary.label}</Cta>}
        </div>
      </Reveal>
    </section>
  );
}

/* ── Page template used by Run / Get / Found ─────────────────────────── */
export default function PillarPage({ pillarKey, seo, hero, marquee, features, steps, faq, cta }) {
  const index = PILLARS.findIndex((p) => p.key === pillarKey);
  const pillar = PILLARS[index];
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={`https://${BASE_DOMAIN}${pillar.path}`} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <PillarHero pillar={pillar} active={pillarKey} index={index + 1} {...hero} />
      <Marquee words={marquee} bg={pillar.bg === "#f5a623" ? "#1a2035" : pillar.bg} />
      <FeatureGrid {...features} />
      <StepsRow {...steps} />
      <CrossLinks active={pillarKey} />
      <FaqSection items={faq} />
      <FinalBand {...cta} />
    </>
  );
}