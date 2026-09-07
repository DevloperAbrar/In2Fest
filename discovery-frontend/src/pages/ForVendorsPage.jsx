import React from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  CheckCircle2, UserPlus, ShieldCheck, Search, CalendarCheck,
  ArrowRight, Star, Sparkles,
} from "lucide-react";
import { BASE_DOMAIN, BRAND_NAME } from "../lib/constants";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

/* ── Trust strip chips ───────────────────────────────────────────────── */
const TRUST_POINTS = ["Free to list", "No commission on bookings", "Verified badge on approval"];

/* ── The 4-step onboarding flow (a real sequence, so numbering earns its place) ── */
const STEPS = [
  {
    icon: UserPlus,
    title: "Create your free profile",
    description: "Add your photos, services, pricing and city in a few minutes — no cost to start.",
  },
  {
    icon: ShieldCheck,
    title: "Get verified",
    description: "Our team checks your business details and awards the verified badge couples trust.",
  },
  {
    icon: Search,
    title: "Get discovered",
    description: "Your profile shows up when couples in your city search your category.",
  },
  {
    icon: CalendarCheck,
    title: "Manage it all in one place",
    description: "Inquiries, WhatsApp chats, your booking calendar and your website — one dashboard.",
  },
];

/* ── Feature deep-dive rows ──────────────────────────────────────────── */
const FEATURES = [
  {
    title: "Get found by real couples",
    description:
      "Your profile appears when couples in your city search for your category — with your ratings, pricing and photos front and center, not buried under paid ads.",
    Mockup: SearchMockup,
  },
  {
    title: "Your own branded website",
    description:
      "Every listing comes with a free, ready-made website on your own subdomain. Pick from professionally designed templates and switch anytime from your dashboard.",
    Mockup: WebsiteBuilderMockup,
  },
  {
    title: "Direct inquiries, no middleman",
    description:
      "Couples reach you straight on WhatsApp or through an inquiry form — every conversation goes to you directly, with no commission taken on what you earn.",
    Mockup: InquiryMockup,
  },
  {
    title: "One dashboard for everything",
    description:
      "Track your booking calendar, respond to reviews and update your profile — all from a single dashboard built for how event businesses actually work.",
    Mockup: DashboardMockup,
  },
];

export default function ForVendorsPage() {
  return (
    <>
      <Helmet>
        <title>List Your Wedding or Event Business on {BRAND_NAME}</title>
        <meta
          name="description"
          content={`Grow your wedding or event business with a free listing on ${BRAND_NAME}. Get discovered by real customers searching for banquet halls, decorators, caterers, photographers and more.`}
        />
        <link rel="canonical" href={`https://www.${BASE_DOMAIN}/for-vendors`} />
      </Helmet>

      {/* ── Hero ── */}
      {/* relative + overflow-hidden so the curve (absolute, bottom-0) clips to this section,
          exactly like the /categories page hero */}
      <section className="bg-navy-900 text-white overflow-hidden relative">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-1.5 bg-white/10 text-gold-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
            >
              <Sparkles size={13} /> For wedding & event businesses
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-[2.6rem] font-display font-bold leading-tight"
            >
              Grow Your Wedding or Event Business with {BRAND_NAME}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-white/70 mt-4 max-w-lg leading-relaxed"
            >
              Whether you run a banquet hall, work as a decorator, caterer, photographer
              or event management company — {BRAND_NAME} connects you with couples and
              families actively planning their event.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3 mt-8"
            >
              <a
                href={`${APP_URL}/login`}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent-500 to-accent-600 text-white px-6 py-3.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Get Started Free <ArrowRight size={16} />
              </a>
              
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-x-5 gap-y-2 mt-7"
            >
              {TRUST_POINTS.map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-xs text-white/60">
                  <CheckCircle2 size={13} className="text-gold-400" /> {t}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-6 bg-gold-500/10 blur-3xl rounded-full" />
            <HeroMockup />
          </motion.div>
        </div>

        {/* Curved bottom edge — same symmetric "hill" shape as the /categories page hero
            (navy dips deeper in the center, rises back up at both edges) */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] pointer-events-none">
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="w-full h-[70px] md:h-[110px]"
          >
            <path
              d="M0,15 Q720,100 1440,15 L1440,120 L0,120 Z"
              fill="#f9fafb"
            />
          </svg>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-navy-900">
            From sign-up to your first inquiry
          </h2>
          <p className="text-gray-500 mt-3 text-sm leading-relaxed">
            A straightforward path — most vendors are live and discoverable the same day.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 relative">
          {/* connecting line, desktop only */}
          <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gray-200" />

          {STEPS.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative text-center md:text-left"
            >
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-white border-2 border-navy-100 flex items-center justify-center mx-auto md:mx-0 mb-4">
                <Icon size={24} className="text-navy-700" />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-display font-bold text-navy-900 text-base mb-1.5">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Feature deep-dives ── */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 space-y-16 md:space-y-24">
          {FEATURES.map(({ title, description, Mockup }, i) => (
            <div
              key={title}
              className={`grid md:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? "md:[direction:rtl]" : ""}`}
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5 }}
                className="[direction:ltr]"
              >
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Mockup />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="[direction:ltr]"
              >
                <h3 className="text-xl md:text-2xl font-display font-bold text-navy-900 mb-3">
                  {title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{description}</p>
              </motion.div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="bg-navy-900 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20 text-center relative">
          <Star size={22} className="text-gold-400 fill-current mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
            Ready to grow your business?
          </h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Join {BRAND_NAME} free and start getting real inquiries from couples planning their event.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={`${APP_URL}/login`}
              className="flex items-center gap-2 bg-gradient-to-r from-accent-500 to-accent-600 text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              List Your Business Free <ArrowRight size={16} />
            </a>

            <a
              href={`${APP_URL}/login`}
              className="flex items-center gap-2 border border-white/20 text-white px-7 py-3.5 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Already Listed? Log In
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Custom SVG mockups — brand-colored, no external images ─────────── */

function HeroMockup() {
  return (
    <svg viewBox="0 0 340 260" className="w-full max-w-sm mx-auto drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
      <rect width="340" height="260" rx="20" fill="#ffffff" />
      <rect width="340" height="90" rx="20" fill="#1a2035" />
      <rect y="70" width="340" height="20" fill="#1a2035" />
      <rect x="16" y="106" width="140" height="14" rx="7" fill="#1a2035" />
      <rect x="16" y="128" width="200" height="10" rx="5" fill="#c3c7d6" />
      <g transform="translate(16,148)">
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            transform={`translate(${i * 16},0)`}
            d="M6 0l1.8 3.6 4 .6-2.9 2.8.7 4L6 9l-3.6 1.9.7-4L.2 4.2l4-.6L6 0z"
            fill="#f5a623"
          />
        ))}
        <rect x="90" y="0" width="30" height="10" rx="5" fill="#e3e5ec" />
      </g>
      <rect x="16" y="178" width="150" height="30" rx="15" fill="#22c55e" />
      <rect x="174" y="178" width="150" height="30" rx="15" fill="#e8192c" />
      <rect x="16" y="222" width="80" height="20" rx="10" fill="#ecfdf5" stroke="#10b981" />
      <rect x="104" y="222" width="100" height="20" rx="10" fill="#eff6ff" stroke="#3b82f6" />
    </svg>
  );
}

function SearchMockup() {
  return (
    <svg viewBox="0 0 300 190" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="190" rx="14" fill="#f8fafc" />
      <rect x="16" y="16" width="200" height="30" rx="15" fill="#ffffff" stroke="#e2e8f0" />
      <circle cx="30" cy="31" r="5" fill="none" stroke="#9ca3af" strokeWidth="2" />
      <rect x="42" y="27" width="90" height="8" rx="4" fill="#d1d5db" />
      <rect x="228" y="16" width="56" height="30" rx="15" fill="#e8192c" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(16, ${62 + i * 42})`}>
          <rect width="268" height="34" rx="10" fill="#ffffff" stroke="#e5e7eb" />
          <rect x="12" y="9" width="16" height="16" rx="4" fill="#1a2035" />
          <rect x="38" y="10" width={100 - i * 10} height="7" rx="3.5" fill="#1a2035" opacity="0.8" />
          <rect x="38" y="21" width={70 - i * 6} height="6" rx="3" fill="#d1d5db" />
          <rect x="230" y="12" width="26" height="10" rx="5" fill={i === 0 ? "#fef3c7" : "#f3f4f6"} />
        </g>
      ))}
    </svg>
  );
}

function WebsiteBuilderMockup() {
  return (
    <svg viewBox="0 0 300 190" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="190" rx="14" fill="#f8fafc" stroke="#e5e7eb" />
      <rect width="300" height="28" rx="14" fill="#e5e7eb" />
      <circle cx="16" cy="14" r="4" fill="#f87171" />
      <circle cx="30" cy="14" r="4" fill="#fbbf24" />
      <circle cx="44" cy="14" r="4" fill="#34d399" />

      <rect x="16" y="40" width="80" height="56" rx="6" fill="#05000f" />
      <circle cx="30" cy="54" r="10" fill="#a855f7" opacity="0.5" />
      <rect x="24" y="76" width="60" height="6" rx="3" fill="#ffffff" opacity="0.8" />

      <rect x="110" y="40" width="80" height="56" rx="6" fill="#faf7f2" stroke="#f0e6da" />
      <rect x="118" y="50" width="40" height="6" rx="3" fill="#c2703d" />
      <rect x="118" y="62" width="55" height="6" rx="3" fill="#4b4238" opacity="0.5" />

      <rect x="204" y="40" width="80" height="56" rx="6" fill="#0a0a0a" />
      <rect x="212" y="50" width="4" height="30" fill="#2563eb" />
      <rect x="222" y="52" width="50" height="6" rx="3" fill="#ffffff" opacity="0.85" />

      <rect x="16" y="112" width="268" height="8" rx="4" fill="#e5e7eb" />
      <rect x="16" y="128" width="200" height="8" rx="4" fill="#e5e7eb" />
      <rect x="16" y="152" width="120" height="24" rx="8" fill="#1a2035" />
    </svg>
  );
}

function InquiryMockup() {
  return (
    <svg viewBox="0 0 300 190" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="190" rx="14" fill="#f0fdf4" />
      <rect x="20" y="24" width="180" height="34" rx="16" fill="#ffffff" />
      <rect x="34" y="34" width="120" height="6" rx="3" fill="#9ca3af" />
      <rect x="34" y="44" width="80" height="6" rx="3" fill="#d1d5db" />

      <rect x="100" y="70" width="180" height="34" rx="16" fill="#22c55e" />
      <rect x="114" y="80" width="120" height="6" rx="3" fill="#ffffff" opacity="0.9" />
      <rect x="114" y="90" width="80" height="6" rx="3" fill="#ffffff" opacity="0.7" />

      <rect x="20" y="116" width="150" height="34" rx="16" fill="#ffffff" />
      <rect x="34" y="126" width="100" height="6" rx="3" fill="#9ca3af" />
      <rect x="34" y="136" width="60" height="6" rx="3" fill="#d1d5db" />

      <circle cx="270" cy="150" r="18" fill="#22c55e" />
      <path d="M264 150l4 4 8-8" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DashboardMockup() {
  return (
    <svg viewBox="0 0 300 190" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="190" rx="14" fill="#ffffff" stroke="#e5e7eb" />
      <rect width="70" height="190" rx="14" fill="#1a2035" />
      <rect x="16" y="24" width="38" height="8" rx="4" fill="#f5a623" />
      <rect x="16" y="48" width="38" height="6" rx="3" fill="#ffffff" opacity="0.6" />
      <rect x="16" y="64" width="30" height="6" rx="3" fill="#ffffff" opacity="0.4" />
      <rect x="16" y="80" width="34" height="6" rx="3" fill="#ffffff" opacity="0.4" />

      {Array.from({ length: 4 }).map((_, r) =>
        Array.from({ length: 6 }).map((_, c) => (
          <rect
            key={`${r}-${c}`}
            x={86 + c * 32}
            y={30 + r * 32}
            width="26"
            height="26"
            rx="5"
            fill={(r + c) % 5 === 0 ? "#e8192c" : (r + c) % 3 === 0 ? "#f5a623" : "#f1f5f9"}
          />
        ))
      )}
      <rect x="86" y="170" width="180" height="10" rx="5" fill="#e5e7eb" />
    </svg>
  );
}