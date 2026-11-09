import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { motion, useReducedMotion } from "framer-motion";
import {
  Globe, CalendarCheck, MessageCircle, Star, BarChart3, ShieldCheck, BadgeCheck,
  CheckCircle2, ArrowRight, Sparkles, LogIn, Send, UserPlus, Search, Smartphone, Minus, Check,
  Clock, MapPin, Loader2,
} from "lucide-react";
import { BASE_DOMAIN, BRAND_NAME } from "../lib/constants";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const EASE = [0.22, 1, 0.36, 1];

/* ── Content ─────────────────────────────────────────────────────────── */
const TRUST = ["Free to list", "No commission", "Verified badge on approval"];

const FEATURES = [
  { icon: Globe, title: "Your own branded website", desc: "A mobile-ready website on your own in2fest.com address with your name, services, gallery and contact details.", tint: "#E0EAFF" },
  { icon: CalendarCheck, title: "Bookings and availability", desc: "Show real open dates, take bookings and manage slots, packages and clients from one dashboard.", tint: "#DDF3E8" },
  { icon: MessageCircle, title: "Direct leads, zero commission", desc: "Inquiries reach you on WhatsApp and in your dashboard. We never take a cut of your bookings.", tint: "#FFF0C2" },
  { icon: Star, title: "Reviews that build trust", desc: "Collect genuine customer reviews and show them on your website and marketplace profile.", tint: "#FFE6D6" },
  { icon: BarChart3, title: "Billing and insights", desc: "Create quotations and invoices with GST, and see how many people view your profile and send inquiries.", tint: "#FFE0E3" },
  { icon: ShieldCheck, title: "Discovered by customers", desc: "Get listed in your city and category on the In2Fest marketplace, with a verified badge once approved.", tint: "#DDF3E8" },
];

const STEPS = [
  { icon: UserPlus, title: "Apply for a free listing", desc: "Fill the short form below. It takes about two minutes." },
  { icon: ShieldCheck, title: "We review and approve", desc: "Our team checks your details and confirms on WhatsApp." },
  { icon: Search, title: "Get discovered", desc: "Customers in your city find you when they search your category." },
  { icon: Sparkles, title: "Upgrade when you are ready", desc: "Log in to the vendor app to choose a plan and unlock your website and tools." },
];

const COMPARE = [
  { label: "Listing on the In2Fest marketplace", free: true, paid: true },
  { label: "Customers can contact you", free: true, paid: true },
  { label: "Your own branded website", free: false, paid: true },
  { label: "Bookings, slots and packages", free: false, paid: true },
  { label: "Clients, quotations and invoices", free: false, paid: true },
  { label: "Reviews, WhatsApp inquiries and analytics", free: false, paid: true },
];

const NEXT = [
  [Clock, "Takes about two minutes"],
  [ShieldCheck, "Our team reviews your details"],
  [MessageCircle, "You get a WhatsApp confirmation"],
  [BadgeCheck, "Verified badge once approved"],
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 26, className = "" }) {
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

function Floaty({ children, className = "", delay = 0 }) {
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

function Arches({ className = "", width = 260, colors = ["#f5a623", "#e8192c", "#ffffff"] }) {
  return (
    <svg className={className} width={width} height={width / 2} viewBox="0 0 220 110" aria-hidden="true">
      <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke={colors[0]} strokeWidth="18" strokeLinecap="round" />
      <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke={colors[1]} strokeWidth="18" strokeLinecap="round" />
      <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke={colors[2]} strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

function Head({ eyebrow, title, sub }) {
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

const stickerRed =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 text-white font-extrabold " +
  "shadow-[0_5px_0_0_#9e0f1b] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_7px_0_0_#9e0f1b] " +
  "active:translate-y-1 active:shadow-none disabled:opacity-60 disabled:pointer-events-none";

const inputCls =
  "w-full px-4 py-3 rounded-xl border-2 border-navy-100 bg-white text-sm text-navy-700 placeholder:text-navy-300 " +
  "transition-colors focus:outline-none focus:border-navy-700 focus:ring-4 focus:ring-gold-500/20";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-navy-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

/* ── Hero ────────────────────────────────────────────────────────────── */
function Hero({ onList }) {
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
      <Floaty className="absolute left-[7%] top-16 hidden md:block" delay={0.3}>
        <svg width="30" height="30" viewBox="0 0 28 28" aria-hidden="true">
          <rect x="11" width="6" height="28" rx="3" fill="#f5a623" /><rect y="11" width="28" height="6" rx="3" fill="#f5a623" />
        </svg>
      </Floaty>
      <Floaty className="absolute right-[8%] top-24 hidden md:block" delay={1}>
        <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16.5" fill="none" stroke="#e8192c" strokeWidth="7" /></svg>
      </Floaty>
      <Arches className="absolute -left-20 bottom-0 opacity-20 hidden lg:block" width={320} colors={["#1a2035", "#1a2035", "#1a2035"]} />
      <Arches className="absolute -right-20 bottom-0 opacity-20 hidden lg:block" width={320} colors={["#1a2035", "#1a2035", "#1a2035"]} />

      <Floaty className="absolute left-[4%] top-[46%] hidden xl:block" delay={0.5}>
        <div className="-rotate-6 rounded-2xl bg-white px-4 py-3 shadow-[0_20px_40px_-20px_rgba(26,32,53,0.45)] flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gold-500 flex items-center justify-center"><MapPin size={18} className="text-navy-700" /></span>
          <div><p className="text-xs font-extrabold text-navy-700">Listed in your city</p><p className="text-[11px] text-navy-400">Sample · after approval</p></div>
        </div>
      </Floaty>
      <Floaty className="absolute right-[4%] top-[52%] hidden xl:block" delay={1.1}>
        <div className="rotate-6 rounded-2xl bg-white px-4 py-3 shadow-[0_20px_40px_-20px_rgba(26,32,53,0.45)] flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center"><MessageCircle size={18} className="text-white" /></span>
          <div><p className="text-xs font-extrabold text-navy-700">New enquiry</p><p className="text-[11px] text-navy-400">Sample · on WhatsApp</p></div>
        </div>
      </Floaty>

      <div className="relative max-w-5xl mx-auto px-4 pt-14 md:pt-20 pb-16 md:pb-24 text-center">
        <motion.p {...rise(0)} className="inline-flex items-center gap-2 text-xs font-bold text-navy-600 bg-white rounded-full px-4 py-2 shadow-sm">
          <Sparkles size={13} className="text-gold-600" /> Powered by {BRAND_NAME}
        </motion.p>

        <h1
          className="font-display font-extrabold text-navy-700 mt-6 flex flex-col items-center gap-y-3"
          style={{ fontSize: "clamp(2.4rem, 6.6vw, 5rem)", letterSpacing: "-0.035em", lineHeight: 1.02 }}
        >
          <motion.span {...rise(0.1)}>Grow your business</motion.span>
          <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
            <motion.span {...rise(0.2)}>with</motion.span>
            <motion.span {...pop(0.35, -2.5)} className="inline-block bg-accent-500 text-white rounded-2xl px-5 pb-1.5 pt-0.5 shadow-[0_14px_0_-6px_#9e0f1b]">
              {BRAND_NAME}
            </motion.span>
          </span>
        </h1>

        <motion.p {...rise(0.5)} className="mt-8 text-base md:text-xl text-navy-500 max-w-2xl mx-auto leading-relaxed">
          Get listed for free, or log in to the vendor app and buy a plan to launch your own website,
          take bookings and manage your customers in one place.
        </motion.p>

        <motion.div {...rise(0.62)} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={onList} className={`${stickerRed} px-8 py-4 text-sm`}>
            List for free <ArrowRight size={16} />
          </button>
          <a
            href={`${APP_URL}/login`}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-navy-700 hover:bg-navy-700 hover:text-white transition px-8 py-4 text-sm font-extrabold text-navy-700"
          >
            <LogIn size={16} /> Login / Buy a plan
          </a>
        </motion.div>

        <motion.ul {...rise(0.75)} className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {TRUST.map((t) => (
            <li key={t} className="flex items-center gap-1.5 text-sm font-semibold text-navy-500">
              <CheckCircle2 size={16} className="text-emerald-600" /> {t}
            </li>
          ))}
        </motion.ul>

        {import.meta.env.DEV && (
          <p className="mt-4 text-xs text-navy-300">Vendor app: {APP_URL.replace(/^https?:\/\//, "")}</p>
        )}
      </div>
    </section>
  );
}

/* ── Marquee ─────────────────────────────────────────────────────────── */
function Marquee() {
  const reduce = useReducedMotion();
  const words = ["Run it", "Get it", "Found it", "Free listing", "No commission", "Verified badge"];
  const track = [...words, ...words].map((w, i) => (
    <span key={i} className="flex items-center gap-8 flex-shrink-0">
      <span className="font-display font-extrabold text-xl md:text-3xl text-white whitespace-nowrap">{w}</span>
      <span className="text-gold-500 text-2xl" aria-hidden="true">✦</span>
    </span>
  ));
  return (
    <div className="bg-[#FFF6E8] py-6 overflow-hidden" aria-hidden="true">
      <div className="bg-accent-500 rotate-1 scale-[1.03] py-4 overflow-hidden">
        {reduce ? (
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 px-4">{track}</div>
        ) : (
          <motion.div className="flex gap-8 w-max" animate={{ x: ["-50%", "0%"] }} transition={{ duration: 30, ease: "linear", repeat: Infinity }}>
            {track}{track}
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── Features ────────────────────────────────────────────────────────── */
function Features() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <Head eyebrow="Built in" title="Everything your business needs." sub="One platform for your website, bookings, leads and customers." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc, tint }, i) => (
            <Reveal key={title} delay={(i % 3) * 0.07}>
              <div className="h-full rounded-3xl bg-white border-2 border-navy-50 p-6 transition duration-300 hover:-translate-y-1.5 hover:border-navy-700 hover:shadow-[0_20px_40px_-24px_rgba(26,32,53,0.5)]">
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tint }}>
                  <Icon size={22} className="text-navy-700" />
                </span>
                <h3 className="mt-5 font-display font-extrabold text-navy-700 text-base">{title}</h3>
                <p className="mt-2 text-sm text-navy-400 leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Steps ───────────────────────────────────────────────────────────── */
function Steps() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-[#FFF6E8] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <Head eyebrow="How it works" title="From sign-up to your first enquiry." />
        <div className="relative mt-14 grid gap-5 md:grid-cols-4">
          <motion.span
            aria-hidden="true"
            className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-1 rounded-full bg-gradient-to-r from-gold-500 via-accent-500 to-navy-700 origin-left"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.2, ease: EASE }}
          />
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 0.12}>
              <div className="relative h-full rounded-[1.75rem] bg-white p-6 pt-12 mt-8 md:mt-0 md:pt-6 md:bg-transparent md:p-0 md:text-center">
                <span className="absolute -top-8 left-6 md:static md:mx-auto w-16 h-16 rounded-2xl bg-navy-700 text-gold-500 flex items-center justify-center shadow-[0_10px_0_-4px_#0b0e1c] md:mb-5 relative z-10">
                  <Icon size={26} />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent-500 text-white text-xs font-extrabold flex items-center justify-center">{i + 1}</span>
                </span>
                <h3 className="font-display font-extrabold text-lg text-navy-700">{title}</h3>
                <p className="mt-2 text-sm text-navy-400 leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Free vs paid ────────────────────────────────────────────────────── */
function Compare({ onList }) {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4">
        <Head eyebrow="Compare" title="Free listing or full plan." sub="Start free. Upgrade only when you want the website and tools." />
        <Reveal className="mt-10">
          <div className="rounded-[2rem] border-2 border-navy-700 bg-white overflow-hidden shadow-[0_8px_0_0_#1a2035]">
            <div className="grid grid-cols-[1fr_84px_84px] sm:grid-cols-[1fr_150px_150px] items-end px-4 sm:px-6 pt-5 pb-4 bg-[#FFF6E8]">
              <span className="text-xs font-extrabold tracking-[0.14em] uppercase text-navy-400">What you get</span>
              <span className="text-center text-xs sm:text-sm font-extrabold text-navy-700">Free listing</span>
              <span className="text-center">
                <span className="inline-block rounded-full bg-accent-500 text-white text-xs sm:text-sm font-extrabold px-3 py-1">Paid plan</span>
              </span>
            </div>
            {COMPARE.map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_84px_84px] sm:grid-cols-[1fr_150px_150px] items-center px-4 sm:px-6 py-3.5 border-t border-navy-50 text-sm hover:bg-[#FFF6E8]/60 transition-colors">
                <span className="font-semibold text-navy-600 pr-3">{row.label}</span>
                <span className="flex justify-center">
                  {row.free
                    ? <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><Check size={14} strokeWidth={3} /></span>
                    : <Minus size={16} className="text-navy-200" />}
                </span>
                <span className="flex justify-center">
                  {row.paid
                    ? <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><Check size={14} strokeWidth={3} /></span>
                    : <Minus size={16} className="text-navy-200" />}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`${APP_URL}/login`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-700 hover:bg-navy-800 transition px-8 py-4 text-sm font-extrabold text-white shadow-[0_5px_0_0_#0b0e1c] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none"
          >
            <LogIn size={16} /> Login to buy a plan
          </a>
          <button
            type="button"
            onClick={onList}
            className="inline-flex items-center justify-center rounded-full border-2 border-navy-700 hover:bg-navy-700 hover:text-white transition px-8 py-4 text-sm font-extrabold text-navy-700"
          >
            Start with a free listing
          </button>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Free listing form ───────────────────────────────────────────────── */
function ListingForm({ form, set, cities, categories, submitted, error, loading, onSubmit }) {
  return (
    <section id="free-listing" className="relative overflow-hidden bg-[#FFF6E8] py-16 md:py-24 scroll-mt-20">
      <div className="relative max-w-6xl mx-auto px-4 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] items-start">
        {/* Left panel */}
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-navy-700 text-white p-8 md:p-10 lg:sticky lg:top-24">
            <Arches className="absolute -right-10 -bottom-6 opacity-90" width={260} />
            <p className="text-xs font-extrabold tracking-[0.18em] uppercase text-gold-500">Found it.</p>
            <h2 className="mt-3 font-display font-extrabold" style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
              List your business <span className="text-gold-500">for free.</span>
            </h2>
            <p className="mt-4 text-white/75 text-sm md:text-base leading-relaxed max-w-sm">
              No subscription required. Our team will review your details and contact you.
            </p>
            <ul className="relative mt-7 space-y-3.5 pb-24">
              {NEXT.map(([Icon, text]) => (
                <li key={text} className="flex items-center gap-3 text-sm font-semibold">
                  <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={17} className="text-gold-500" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* Form card */}
        <Reveal delay={0.1}>
          <div className="rounded-[2rem] bg-white border-2 border-navy-700 shadow-[0_8px_0_0_#1a2035] p-6 md:p-9">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="text-center py-6"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5">
                  <CheckCircle2 size={34} />
                </div>
                <h2 className="font-display font-extrabold text-3xl text-navy-700 mb-2" style={{ letterSpacing: "-0.02em" }}>You are registered!</h2>
                <p className="text-sm md:text-base text-navy-400 max-w-sm mx-auto leading-relaxed">
                  Your free listing is under review. You will get a WhatsApp confirmation once it is approved.
                </p>
                <a href={`${APP_URL}/login`} className={`${stickerRed} mt-7 px-7 py-3.5 text-sm`}>
                  <Smartphone size={16} /> Want your own website? Login and buy a plan
                </a>
              </motion.div>
            ) : (
              <>
                <h3 className="font-display font-extrabold text-2xl text-navy-700" style={{ letterSpacing: "-0.02em" }}>Apply for your free listing</h3>
                <p className="text-sm text-navy-400 mt-1 mb-6">Fields marked * are required.</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Business name *">
                    <input className={inputCls} placeholder="e.g. Fit Zone Gym" value={form.business_name} onChange={set("business_name")} />
                  </Field>
                  <Field label="Owner name *">
                    <input className={inputCls} placeholder="Your full name" value={form.owner_name} onChange={set("owner_name")} />
                  </Field>
                  <Field label="Phone number *">
                    <input className={inputCls} type="tel" placeholder="10 digit number" value={form.phone} onChange={set("phone")} />
                  </Field>
                  <Field label="WhatsApp number">
                    <input className={inputCls} type="tel" placeholder="If different from phone" value={form.whatsapp_number} onChange={set("whatsapp_number")} />
                  </Field>
                  <Field label="City *">
                    <select className={inputCls} value={form.city_id} onChange={set("city_id")}>
                      <option value="">Select city</option>
                      {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Locality / area">
                    <input className={inputCls} placeholder="e.g. Arera Colony" value={form.locality} onChange={set("locality")} />
                  </Field>
                  <Field label="Primary category *">
                    <select className={inputCls} value={form.category_id} onChange={set("category_id")}>
                      <option value="">Select category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Starting price (optional)">
                    <input className={inputCls} type="number" min="0" placeholder="₹" value={form.starting_price} onChange={set("starting_price")} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="About your business (optional)">
                      <textarea rows={4} className={inputCls} placeholder="What do you offer?" value={form.about} onChange={set("about")} />
                    </Field>
                  </div>
                </div>

                <p className="mt-4 text-xs text-navy-300">You can add photos after your listing is approved.</p>

                {error && (
                  <p role="alert" className="mt-4 rounded-xl bg-accent-50 border border-accent-100 px-4 py-2.5 text-sm font-semibold text-accent-600">
                    {error}
                  </p>
                )}

                <button type="button" disabled={loading} onClick={onSubmit} className={`${stickerRed} w-full mt-6 py-4 text-sm`}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {loading ? "Submitting..." : "Submit for review"}
                </button>

                <div className="mt-7 pt-6 border-t border-navy-50 text-center">
                  <p className="text-sm text-navy-400 mb-3">Already a vendor, or want to buy a plan right away?</p>
                  <a
                    href={`${APP_URL}/login`}
                    className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-navy-700 text-navy-700 hover:bg-navy-700 hover:text-white transition px-6 py-2.5 text-sm font-extrabold"
                  >
                    <LogIn size={16} /> Login to the vendor app
                  </a>
                </div>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default function JoinIn2FestPage() {
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    business_name: "", owner_name: "", phone: "", whatsapp_number: "",
    city_id: "", locality: "", category_id: "", starting_price: "", about: "", photos: [],
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/meta/cities`).then(({ data }) => setCities(data.data || [])).catch(() => {});
    axios.get(`${API_BASE_URL}/meta/categories`).then(({ data }) => setCategories(data.data || [])).catch(() => {});
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const scrollToForm = () => {
    document.getElementById("free-listing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.business_name || !form.owner_name || !form.phone || !form.city_id || !form.category_id) {
      setError("Please fill all required fields");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10 digit phone number");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/listing/register`, form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const title = `Join ${BRAND_NAME} - List Your Business Free or Get Your Website`;
  const description =
    "List your business on In2Fest for free, or log in to the vendor app to buy a plan and get your own website, bookings, billing and more.";

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://${BASE_DOMAIN}/join`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      <Hero onList={scrollToForm} />
      <Marquee />
      <Features />
      <Steps />
      <Compare onList={scrollToForm} />
      <ListingForm
        form={form}
        set={set}
        cities={cities}
        categories={categories}
        submitted={submitted}
        error={error}
        loading={loading}
        onSubmit={handleSubmit}
      />
    </>
  );
}