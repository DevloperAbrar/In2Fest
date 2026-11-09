import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Check, Minus } from "lucide-react";
import api from "../lib/api";
import { BASE_DOMAIN, BRAND_NAME } from "../lib/constants";
import VendorCard from "../components/search/VendorCard";
import HomeFAQ, { homeFaqItems } from "../components/home/HomeFAQ";
import HeroSection from "../components/home/landing/HeroSection";
import Marquee from "../components/home/landing/Marquee";
import StackPanels from "../components/home/landing/StackPanels";
import BusinessTabs from "../components/home/landing/BusinessTabs";
import { Arches, Floaty, Plus, Ring } from "../components/home/landing/art";
import { CountUp, Reveal, SectionHead } from "../components/home/landing/ui";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

const TITLE = `${BRAND_NAME} - Run it. Get it. Found it.`;
const DESCRIPTION =
  "Run your local business with simple software, get your own website and get found by customers near you. Gyms, libraries, restaurants, shops, clinics and event businesses contact customers directly on WhatsApp. No commission.";

// Typical types of tools, described without naming any brand.
const COMPARE = [
  ["Free business listing", [true, false, true]],
  ["Management software (members, billing, bookings)", [false, true, true]],
  ["Your own website", [false, "Sometimes", true]],
  ["New customers from a local marketplace", ["Paid leads", false, true]],
  ["Customers contact you directly", ["Often shared", true, true]],
  ["No commission on your customers", [true, true, true]],
];

function Cell({ v }) {
  if (v === true) return <Check size={20} strokeWidth={3} className="mx-auto text-emerald-600" aria-label="Yes" />;
  if (v === false) return <Minus size={20} className="mx-auto text-navy-200" aria-label="No" />;
  return <span className="text-xs font-semibold text-navy-400">{v}</span>;
}

function StatsStrip({ stats }) {
  const items = [
    { label: "Verified businesses listed", value: stats?.total_vendors },
    { label: "Cities covered", value: stats?.cities_covered },
  ].filter((s) => Number(s.value) > 0);
  if (items.length === 0) return null; // only real numbers, never placeholders
  return (
    <section className="bg-navy-700">
      <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-2 gap-6 text-center">
        {items.map((s) => (
          <div key={s.label}>
            <p className="font-display font-extrabold text-4xl md:text-6xl text-gold-500" style={{ letterSpacing: "-0.03em" }}>
              <CountUp to={Number(s.value)} suffix="+" />
            </p>
            <p className="text-sm md:text-base text-white/75 mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  ["Register", "Create your free account with your business name, city and category.", "#e8192c", "#fff"],
  ["Set up", "Add your services, plans and customers. Import your list from Excel if you have one.", "#f5a623", "#1a2035"],
  ["Go live", "Your website and marketplace listing are ready to share with customers.", "#1a2035", "#fff"],
];

export default function Home() {
  const [homeData, setHomeData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/homepage")
      .then(({ data }) => { if (!cancelled) setHomeData(data.data); })
      .catch(() => { if (!cancelled) setHomeData(null); });
    return () => { cancelled = true; };
  }, []);

  const featured = homeData?.featured_vendors || [];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homeFaqItems.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`https://${BASE_DOMAIN}/`} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <HeroSection />
      <Marquee />
      <StatsStrip stats={homeData?.trust_stats} />
      <StackPanels />
      <BusinessTabs />

      {featured.length > 0 && (
        <section className="bg-[#FFF6E8] py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4">
            <SectionHead title="Featured businesses" eyebrow="On In2Fest now" />
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((v) => <VendorCard key={v.id} vendor={v} />)}
            </div>
          </div>
        </section>
      )}

      {/* Comparison by type of tool, no brand names */}
      <section className="bg-[#FFF6E8] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <SectionHead
            center
            eyebrow="Why In2Fest"
            title="Listing sites and software apps each do half the job."
            sub="Compared by type of service. Individual products vary."
          />
          <Reveal className="mt-10 overflow-x-auto rounded-3xl border-2 border-navy-700 bg-white">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b-2 border-navy-700">
                  <th className="text-left font-medium text-navy-400 p-4 w-[40%]"> </th>
                  <th className="p-4 font-bold text-navy-500">Listing sites</th>
                  <th className="p-4 font-bold text-navy-500">Software-only apps</th>
                  <th className="p-4 font-extrabold text-white bg-accent-500">{BRAND_NAME}</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([label, vals]) => (
                  <tr key={label} className="border-b last:border-0 border-navy-50">
                    <td className="p-4 font-medium text-navy-600">{label}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={`p-4 text-center ${i === 2 ? "bg-accent-50" : ""}`}>
                        <Cell v={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      {/* How to start */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHead center eyebrow="Getting started" title="Start in three simple steps." />
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {STEPS.map(([t, d, bg, fg], i) => (
              <Reveal key={t} delay={i * 0.1}>
                <div className="h-full rounded-[2rem] p-8 transition hover:-translate-y-1.5 duration-300" style={{ background: bg, color: fg }}>
                  <span className="font-display font-extrabold text-7xl opacity-30 leading-none" aria-hidden="true">{i + 1}</span>
                  <h3 className="font-display font-extrabold text-2xl mt-2">{t}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed opacity-85">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-[#FFF6E8]"><HomeFAQ /></div>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-navy-700 py-20 md:py-28">
        <Arches className="absolute -left-16 -bottom-10 opacity-90 hidden md:block" width={340} />
        <Arches className="absolute -right-16 -bottom-10 opacity-90 hidden md:block" width={340} />
        <Floaty className="absolute left-[18%] top-12 hidden md:block"><Plus size={26} /></Floaty>
        <Floaty className="absolute right-[18%] top-16 hidden md:block" delay={1}><Ring size={38} /></Floaty>
        <Reveal className="relative max-w-3xl mx-auto px-4 text-center">
          <h2
            className="font-display font-extrabold text-white"
            style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1.04 }}
          >
            Run it. <span className="text-gold-500">Get it.</span> Found it.
          </h2>
          <p className="mt-5 text-white/75 text-base md:text-lg">Create your free account in a few minutes.</p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`${APP_URL}/login`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 hover:bg-accent-600 transition px-9 py-4 text-sm font-extrabold text-white"
            >
              Start free <ArrowRight size={16} />
            </a>
            <Link
              to="/for-vendors"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/30 hover:border-white transition px-9 py-4 text-sm font-extrabold text-white"
            >
              How it works for vendors
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}