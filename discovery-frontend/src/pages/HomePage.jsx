import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, MessageCircle, Users, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import HeroSearch from "../components/homepage/HeroSearch";
import VendorCard from "../components/search/VendorCard";
import HeroBackground from "../components/common/HeroBackground";
import api from "../lib/api";
import { CATEGORIES, BASE_DOMAIN, BRAND_NAME } from "../lib/constants";
import WhyDifferent from "../components/home/WhyDifferent";
import BudgetCalculator from "../components/home/BudgetCalculator";
import Testimonials from "../components/home/Testimonials";

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const duration = 1400;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(progress * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to]);
  return <span>{val.toLocaleString("en-IN")}{suffix}</span>;
}

export default function HomePage() {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/homepage")
      .then(({ data }) => setHomeData(data.data))
      .catch(() => setHomeData(null))
      .finally(() => setLoading(false));
  }, []);

  const stats = homeData?.trust_stats;
  const featured = homeData?.featured_vendors || [];
  const topCities = homeData?.top_cities || [];

  return (
    <>
      <Helmet>
        <title>{BRAND_NAME} - Find Verified Wedding & Event Vendors Near You</title>
        <meta
          name="description"
          content={`Search, compare and directly contact verified banquet halls, decorators, caterers, photographers and every other wedding or event vendor on ${BRAND_NAME}.`}
        />
        <link rel="canonical" href={`https://www.${BASE_DOMAIN}/`} />
      </Helmet>

      {/* ════════════════════════════════════════════════════════════
          HERO - search-first, with a real background photo layer
      ════════════════════════════════════════════════════════════ */}
      <HeroBackground file="hero.png" opacity={0.35}>
        <HeroSearch topCities={topCities} />
      </HeroBackground>

      {/* ════════════════════════════════════════════════════════════
          TRUST STATS
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-10 border-b border-gray-50">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="font-display font-extrabold text-3xl md:text-4xl" style={{ color: "#1a2035" }}>
              <Counter to={stats?.total_vendors ?? 0} suffix="+" />
            </p>
            <p className="text-sm text-gray-500 mt-1">Verified vendors</p>
          </div>
          <div>
            <p className="font-display font-extrabold text-3xl md:text-4xl" style={{ color: "#1a2035" }}>
              <Counter to={stats?.cities_covered ?? 0} suffix="+" />
            </p>
            <p className="text-sm text-gray-500 mt-1">Cities covered</p>
          </div>
          <div>
            <p className="font-display font-extrabold text-3xl md:text-4xl" style={{ color: "#1a2035" }}>
              <Counter to={stats?.events_completed ?? 0} suffix="+" />
            </p>
            <p className="text-sm text-gray-500 mt-1">Events completed</p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          POPULAR CATEGORIES
      ════════════════════════════════════════════════════════════ */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-gray-900">
              Browse by category
            </h2>
            <Link to="/categories" className="text-sm font-semibold hover:underline" style={{ color: "#e8192c" }}>
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CATEGORIES.slice(0, 10).map((cat) => (
              <Link
                key={cat.slug}
                to={`/search?category=${cat.slug}`}
                className="bg-gray-50 hover:bg-primary-50 border border-gray-100 hover:border-primary-200 rounded-xl px-4 py-4 text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors text-center"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FEATURED VENDORS (only renders once real data exists)
      ════════════════════════════════════════════════════════════ */}
      {!loading && featured.length > 0 && (
        <section className="py-14" style={{ background: "#f8f9fb" }}>
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-gray-900 mb-6">
              Featured this week
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((v) => <VendorCard key={v.id} vendor={v} />)}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════
          WHY In2Fest - trust row
      ════════════════════════════════════════════════════════════ */}
      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {[
            { icon: ShieldCheck, title: "Verified vendors", desc: "Every listed business is reviewed before it goes live on search." },
            { icon: MessageCircle, title: "Direct contact, no middleman", desc: "Message vendors on WhatsApp directly - no commission, no runaround." },
            { icon: Users, title: "Real customer reviews", desc: "Ratings come from actual completed bookings, not paid placements." },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="p-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "#fdecec" }}
                >
                  <Icon size={22} style={{ color: "#e8192c" }} />
                </div>
                <h3 className="font-display font-bold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <WhyDifferent />
      <BudgetCalculator />
      <Testimonials />
      {/* ════════════════════════════════════════════════════════════
          VENDOR ACQUISITION CTA - sends business owners the other way
      ════════════════════════════════════════════════════════════ */}
      <section className="py-14" style={{ background: "linear-gradient(135deg,#1a2035,#12172a)" }}>

        <div className="max-w-3xl mx-auto px-4 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest uppercase text-white bg-white/10 border border-white/15 px-4 py-1.5 rounded-full mb-5">
            <TrendingUp size={12} style={{ color: "#f5a623" }} />
            Own a wedding or event business?
          </span>
          <h2 className="font-display font-extrabold text-white mb-4" style={{ fontSize: "clamp(1.5rem,3.5vw,2.25rem)" }}>
            List free & get your own website
          </h2>
          <p className="text-white/70 text-sm md:text-base mb-7 max-w-xl mx-auto">
            Get discovered by couples searching right now, plus a free branded website and booking calendar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/for-vendors"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "#e8192c" }}
            >
              List Your Business Free <ArrowRight size={15} />
            </Link>
            <Link
              to="/get-website"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
            >
              <Sparkles size={15} /> See the website builder
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}