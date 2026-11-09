import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, ChevronRight } from "lucide-react";
import { BASE_DOMAIN, BRAND_NAME } from "../lib/constants";
import {
  APP_URL, EASE, PILLARS, Reveal, Floaty, Arches, Head, Cta, PillarTabs, Marquee, FaqSection, FinalBand,
  RunVisual, GetVisual, FoundVisual,
} from "../components/vendor/VendorKit";

const TRUST = ["Free to list", "No commission", "Verified badge on approval"];

const ROWS = [
  {
    key: "run",
    visual: <RunVisual />,
    text: "Your daily work in one simple dashboard, on your phone.",
    pts: ["GST bills shared on WhatsApp", "Members, plans, renewals and dues", "Stock, attendance and staff salary", "Collections and sales analytics"],
  },
  {
    key: "get",
    visual: <GetVisual />,
    text: "A branded website of your own, ready from your profile.",
    pts: ["Live within a day", "Catalogue, gallery and reviews", "WhatsApp and enquiry buttons", "Your own in2fest.com address"],
  },
  {
    key: "found",
    visual: <FoundVisual />,
    text: "A verified listing that local customers can find.",
    pts: ["Listed by city and category", "Verified badge on approval", "Real customer reviews", "Direct enquiries, no commission"],
  },
];

const FLOW = [
  ["You run", "Your business and customers live in one app."],
  ["Your website is built", "Your details become a branded website."],
  ["Customers find you", "Your profile shows in the marketplace."],
];

const FAQ = [
  ["What does In2Fest give a vendor?", "One account with three parts. Run it is the management app for daily work, Get it is your own website, and Found it is your listing in the marketplace where customers find you."],
  ["Is it really free to list my business?", "Yes. Creating your profile and getting listed on In2Fest is free."],
  ["Do I pay a commission on customers?", "No. Customers contact you directly, and we do not take a commission on them."],
  ["Do I need a laptop?", "No. Everything works on a phone, and the same account also works on a tablet or a desktop."],
  ["Which businesses can use it?", "The management app is built first for businesses with monthly customers, such as gyms, coaching, tiffin and mess and study libraries. Restaurants, shops and event venues use the website and the marketplace listing."],
];

function Hero() {
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
      <Floaty className="absolute left-[7%] top-32 hidden md:block" delay={0.3}>
        <svg width="30" height="30" viewBox="0 0 28 28" aria-hidden="true"><rect x="11" width="6" height="28" rx="3" fill="#f5a623" /><rect y="11" width="28" height="6" rx="3" fill="#f5a623" /></svg>
      </Floaty>
      <Floaty className="absolute right-[8%] top-40 hidden md:block" delay={1}>
        <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16.5" fill="none" stroke="#e8192c" strokeWidth="7" /></svg>
      </Floaty>
      <Arches className="absolute -left-20 bottom-0 opacity-20 hidden lg:block" width={320} colors={["#1a2035", "#1a2035", "#1a2035"]} />
      <Arches className="absolute -right-20 bottom-0 opacity-20 hidden lg:block" width={320} colors={["#1a2035", "#1a2035", "#1a2035"]} />

      <div className="relative max-w-5xl mx-auto px-4 pt-8 md:pt-10 pb-16 md:pb-24 text-center">
        <motion.div {...rise(0)}><PillarTabs active="all" /></motion.div>

        <motion.p {...rise(0.08)} className="mt-10 inline-flex items-center gap-2 text-xs font-bold text-navy-600 bg-white rounded-full px-4 py-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-accent-500" />
          For gyms, libraries, restaurants, shops, clinics and more
        </motion.p>

        <h1 className="font-display font-extrabold mt-6 flex flex-col items-center gap-y-4" style={{ fontSize: "clamp(2.6rem, 7.4vw, 5.6rem)", letterSpacing: "-0.04em", lineHeight: 1 }}>
          {PILLARS.map((p, i) => (
            <motion.span
              key={p.key}
              {...pop(0.2 + i * 0.15, i === 1 ? 1.5 : -2)}
              className="inline-block rounded-2xl px-6 pb-2 pt-0.5"
              style={{ background: p.bg, color: p.fg, boxShadow: `0 12px 0 -6px ${p.shadow}`, ...(reduce ? { transform: `rotate(${i === 1 ? 1.5 : -2}deg)` } : {}) }}
            >
              {p.word}
            </motion.span>
          ))}
        </h1>

        <motion.p {...rise(0.7)} className="mt-9 text-base md:text-xl text-navy-500 max-w-2xl mx-auto leading-relaxed">
          One affordable app to run your daily work, a website of your own, and a listing that gets you found by customers near you.
        </motion.p>

        <motion.div {...rise(0.82)} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Cta href={`${APP_URL}/login`} variant="red">Get started free <ArrowRight size={16} /></Cta>
          <Cta to="/for-vendors/run-it" variant="navy">See what you get</Cta>
        </motion.div>

        <motion.ul {...rise(0.92)} className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {TRUST.map((t) => (
            <li key={t} className="flex items-center gap-1.5 text-sm font-semibold text-navy-500">
              <CheckCircle2 size={16} className="text-emerald-600" /> {t}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

function Rows() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <Head eyebrow="What you get" title="Three things every local business needs." sub="Pick a part to see exactly what it does for you." />
        <div className="mt-14 space-y-8">
          {ROWS.map((r, i) => {
            const p = PILLARS.find((x) => x.key === r.key);
            const Icon = p.icon;
            const flip = i % 2 === 1;
            return (
              <Reveal key={r.key}>
                <article
                  className="grid gap-8 lg:grid-cols-2 items-center rounded-[2.2rem] p-6 sm:p-10"
                  style={{ background: p.bg, color: p.fg }}
                >
                  <div className={flip ? "lg:order-2" : ""}>
                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: p.chip }}><Icon size={22} /></span>
                    <h3 className="mt-4 font-display font-extrabold" style={{ fontSize: "clamp(2.6rem, 6vw, 4.2rem)", letterSpacing: "-0.045em", lineHeight: 1 }}>{p.word}</h3>
                    <p className="mt-3 text-lg font-semibold leading-snug max-w-md" style={{ color: p.soft }}>{r.text}</p>
                    <ul className="mt-5 space-y-2.5">
                      {r.pts.map((t) => (
                        <li key={t} className="flex items-center gap-2.5 text-sm sm:text-base font-semibold">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: p.chip }}><Check size={12} strokeWidth={3} /></span>
                          {t}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={p.path}
                      className="group mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-navy-700 shadow-[0_5px_0_0_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-none"
                    >
                      Explore {p.word.replace(".", "")}
                      <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                  </div>
                  <div className={`mx-auto w-full max-w-sm ${flip ? "lg:order-1" : ""}`}>{r.visual}</div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Flow() {
  return (
    <section className="bg-[#FFF6E8] py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-4">
        <Head eyebrow="One account" title="Three parts that work together." sub="Everything starts from the one profile you create." />
        <div className="mt-12 grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch">
          {FLOW.map(([t, d], i) => {
            const p = PILLARS[i];
            const Icon = p.icon;
            return (
              <React.Fragment key={t}>
                <Reveal delay={i * 0.12}>
                  <div className="h-full rounded-3xl bg-white border-2 border-navy-50 p-6 text-center transition duration-300 hover:-translate-y-1.5 hover:border-navy-700">
                    <span className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: p.bg, color: p.fg }}><Icon size={24} /></span>
                    <h3 className="mt-4 font-display font-extrabold text-navy-700">{t}</h3>
                    <p className="mt-1.5 text-sm text-navy-400">{d}</p>
                  </div>
                </Reveal>
                {i < FLOW.length - 1 && (
                  <div className="hidden md:flex items-center justify-center text-navy-300" aria-hidden="true">
                    <ChevronRight size={28} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function ForVendorsPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const title = `List Your Business Free on ${BRAND_NAME} | Run it, Get it, Found it`;
  const description = `One affordable app for local businesses: run daily work, get your own website and get found by customers near you. For gyms, libraries, restaurants, shops, clinics and events. No commission.`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://${BASE_DOMAIN}/for-vendors`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <Hero />
      <Marquee words={["Run it", "Get it", "Found it", "Free listing", "No commission", "Verified badge"]} />
      <Rows />
      <Flow />
      <FaqSection items={FAQ} />
      <FinalBand
        title="Ready to grow?"
        accent="It starts free."
        sub={`Join ${BRAND_NAME} and start getting enquiries from customers near you.`}
        primary={{ href: `${APP_URL}/login`, label: "List your business free" }}
        secondary={{ href: `${APP_URL}/login`, label: "Already listed? Log in" }}
      />
    </>
  );
}