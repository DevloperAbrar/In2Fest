import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronRight, SearchX, ShieldCheck, MessageCircle, BadgeIndianRupee,
  ArrowRight, Sparkles,
} from "lucide-react";

import { BASE_DOMAIN, BRAND_NAME } from "../lib/constants";
import { SOON_GROUP, buildLiveGroups } from "../lib/launchConfig";
import useCategories from "../components/search/useCategories";
import resolveCategoryIcon from "../components/search/categoryIcon";

const ROW_LIMIT = 8; // categories shown per group before "Show all"

function scrollToGroup(key) {
  document.getElementById(`group-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* Decorative arches, same motif as the home and search heroes. */
function Arches({ className = "", flip = false }) {
  const colors = flip ? ["#1a2035", "#e8192c", "#f5a623"] : ["#f5a623", "#e8192c", "#1a2035"];
  return (
    <svg className={className} width="260" height="130" viewBox="0 0 220 110" aria-hidden="true">
      <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke={colors[0]} strokeWidth="18" strokeLinecap="round" />
      <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke={colors[1]} strokeWidth="18" strokeLinecap="round" />
      <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke={colors[2]} strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

function LiveTile({ cat, group }) {
  const Icon = resolveCategoryIcon(cat.icon);
  return (
    <Link
      to={`/search?category=${cat.slug}`}
      className="group flex items-center gap-3 rounded-2xl border-2 border-transparent p-3 transition duration-300 hover:-translate-y-0.5 hover:border-navy-700 hover:shadow-[0_14px_24px_-16px_rgba(26,32,53,0.55)]"
      style={{ background: group.tint }}
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm transition duration-300 group-hover:scale-110 group-hover:-rotate-6">
        <Icon size={20} strokeWidth={2.2} style={{ color: group.ink }} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-navy-700">{cat.label}</span>
      <ChevronRight
        size={16}
        className="flex-shrink-0 -translate-x-1 text-navy-700 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
      />
    </Link>
  );
}

function GroupPanel({ group, items, index, forceOpen }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = group.icon;
  const open = expanded || forceOpen || items.length <= ROW_LIMIT;
  const shown = open ? items : items.slice(0, ROW_LIMIT);

  return (
    <motion.section
      id={`group-${group.key}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.16) }}
      className="mb-6 scroll-mt-40 rounded-[2rem] border border-navy-100 bg-white p-5 shadow-[0_24px_50px_-34px_rgba(26,32,53,0.45)] sm:p-7"
    >
      <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-navy-50 pb-5">
        <span
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{ background: group.tint }}
        >
          <Icon size={22} strokeWidth={2.2} style={{ color: group.ink }} />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className="font-display text-xl font-extrabold leading-tight text-navy-700"
            style={{ letterSpacing: "-0.02em" }}
          >
            {group.title}
          </h2>
          {group.tagline && <p className="mt-0.5 text-sm text-navy-400">{group.tagline}</p>}
        </div>
        <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
        </span>
        <span className="flex-shrink-0 text-xs font-bold text-navy-300">
          {items.length} {items.length === 1 ? "category" : "categories"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((cat) => (
          <LiveTile key={cat.slug} cat={cat} group={group} />
        ))}
      </div>

      {items.length > ROW_LIMIT && !forceOpen && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-4 rounded-full border-2 border-navy-100 px-4 py-1.5 text-xs font-extrabold text-navy-600 transition-colors hover:border-navy-700 hover:bg-navy-700 hover:text-white"
        >
          {expanded ? "Show fewer" : `Show all ${items.length} categories`}
        </button>
      )}
    </motion.section>
  );
}

function SoonPanel({ items }) {
  // Group the upcoming categories by the business type the admin assigned.
  const byType = useMemo(() => {
    const map = new Map();
    items.forEach((c) => {
      const key = c.businessTypeLabel || "More categories";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    return [...map.entries()];
  }, [items]);

  if (!items.length) return null;
  const Icon = SOON_GROUP.icon;

  return (
    <motion.section
      id={`group-${SOON_GROUP.key}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      className="mb-6 scroll-mt-40 rounded-[2rem] border-2 border-dashed border-navy-100 bg-white/60 p-5 sm:p-7"
    >
      <div className="mb-5 flex items-start gap-3 border-b border-dashed border-navy-100 pb-5">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F3F1EC]">
          <Icon size={22} className="text-navy-400" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className="font-display text-xl font-extrabold leading-tight text-navy-600"
            style={{ letterSpacing: "-0.02em" }}
          >
            {SOON_GROUP.title}
          </h2>
          <p className="mt-0.5 text-sm text-navy-400">
            We are onboarding verified vendors in these categories. Open one to see when it goes live.
          </p>
        </div>
        <span className="flex-shrink-0 text-xs font-bold text-navy-300">{items.length} categories</span>
      </div>

      <div className="space-y-5">
        {byType.map(([label, list]) => (
          <div key={label}>
            <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-navy-300">{label}</p>
            <div className="flex flex-wrap gap-2">
              {list.map((cat) => {
                const CatIcon = resolveCategoryIcon(cat.icon);
                return (
                  <Link
                    key={cat.slug}
                    to={`/search?category=${cat.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-navy-100 bg-white px-3.5 py-1.5 text-xs font-bold text-navy-500 transition-colors hover:border-navy-400 hover:text-navy-700"
                  >
                    <CatIcon size={13} className="text-navy-300" />
                    {cat.label}
                    <span className="ml-0.5 rounded-full bg-[#F3F1EC] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-navy-400">
                      Soon
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-[#FFF6E8] px-5 py-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm font-medium text-navy-600">
          Run one of these businesses? Get listed early and be the first customers find in your city.
        </p>
        <Link
          to="/register-free"
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-accent-600"
        >
          <Sparkles size={14} /> List your business <ArrowRight size={14} />
        </Link>
      </div>
    </motion.section>
  );
}

export default function CategoriesIndexPage() {
  const { categories, loading } = useCategories();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const { liveGroups, soonItems, totalVisible } = useMemo(() => {
    const visible = q ? categories.filter((c) => c.label.toLowerCase().includes(q)) : categories;
    const live = buildLiveGroups(visible);
    const soon = visible.filter((c) => !c.isLive);
    const total = live.reduce((s, g) => s + g.items.length, 0) + soon.length;
    return { liveGroups: live, soonItems: soon, totalVisible: total };
  }, [categories, q]);

  const liveCount = useMemo(() => categories.filter((c) => c.isLive).length, [categories]);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `https://${BASE_DOMAIN}/` },
      { "@type": "ListItem", position: 2, name: "Categories", item: `https://${BASE_DOMAIN}/categories` },
    ],
  };

  return (
    <>
      <Helmet>
        <title>All Business Categories | {BRAND_NAME}</title>
        <meta
          name="description"
          content={`Browse verified gyms, libraries, shops, restaurants and event vendors on ${BRAND_NAME}. Contact businesses directly on WhatsApp. No commission.`}
        />
        <link rel="canonical" href={`https://${BASE_DOMAIN}/categories`} />
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* HERO: cream, same language as the home and search pages */}
      <section className="relative overflow-hidden bg-[#FFF6E8]">
        <Arches className="absolute -left-10 -bottom-6 hidden opacity-90 md:block" />
        <Arches className="absolute -right-10 -bottom-6 hidden opacity-90 md:block" flip />

        <div className="relative z-10 mx-auto max-w-4xl px-4 pb-12 pt-8 text-center md:pb-16 md:pt-10">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-center gap-1.5 text-xs font-bold text-navy-400">
            <Link to="/" className="transition-colors hover:text-navy-700">Home</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="text-navy-700" aria-current="page">Categories</span>
          </nav>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-navy-600 shadow-sm"
          >
            <span className="h-2 w-2 rounded-full bg-accent-500" /> {liveCount > 0 ? `${liveCount} categories live` : "Browse by category"}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="mb-4 font-display font-extrabold text-navy-700"
            style={{ fontSize: "clamp(1.9rem,5vw,3.2rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}
          >
            Every local business, <span className="text-accent-500">by category.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mx-auto mb-7 max-w-xl text-base text-navy-400 md:text-lg"
          >
            Gyms, libraries, shops, restaurants and event vendors. Pick a category to see verified businesses near you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="relative mx-auto max-w-xl"
          >
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-navy-300" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a category, e.g. Gym or Restaurant"
              aria-label="Search categories"
              className="w-full rounded-full border-2 border-transparent bg-white py-3.5 pl-12 pr-5 text-sm font-medium text-navy-700 shadow-[0_20px_40px_-24px_rgba(26,32,53,0.45)] placeholder:text-navy-300 focus:border-navy-700 focus:outline-none"
            />
          </motion.div>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-navy-500">
            <li className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-emerald-600" /> Verified businesses</li>
            <li className="inline-flex items-center gap-1.5"><MessageCircle size={15} className="text-[#25D366]" /> Contact directly on WhatsApp</li>
            <li className="inline-flex items-center gap-1.5"><BadgeIndianRupee size={15} className="text-gold-600" /> No commission</li>
          </ul>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-[#FFFBF3] pb-16">
        <div className="mx-auto max-w-6xl px-4 pt-6">
          {!loading && (liveGroups.length > 0 || soonItems.length > 0) && (
            <div className="sticky top-[68px] z-20 -mx-4 mb-6 border-b border-navy-100 bg-[#FFFBF3]/95 px-4 py-3 backdrop-blur-sm">
              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
                <span className="flex-shrink-0 text-xs font-bold text-navy-400">Jump to:</span>
                {liveGroups.map(({ group }) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => scrollToGroup(group.key)}
                    className="flex-shrink-0 rounded-full border-2 border-navy-100 bg-white px-3.5 py-1.5 text-xs font-extrabold text-navy-600 transition-colors hover:border-navy-700 hover:bg-navy-700 hover:text-white"
                  >
                    {group.title}
                  </button>
                ))}
                {soonItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => scrollToGroup(SOON_GROUP.key)}
                    className="flex-shrink-0 rounded-full border-2 border-dashed border-navy-200 px-3.5 py-1.5 text-xs font-extrabold text-navy-400 transition-colors hover:border-navy-400 hover:text-navy-700"
                  >
                    Launching soon
                  </button>
                )}
              </div>
            </div>
          )}

          {loading && categories.length === 0 ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, gi) => (
                <div key={gi} className="rounded-[2rem] border border-navy-100 bg-white p-7">
                  <div className="mb-5 flex items-center gap-3 border-b border-navy-50 pb-5">
                    <div className="h-12 w-12 animate-pulse rounded-2xl bg-navy-50" />
                    <div className="h-5 w-48 animate-pulse rounded bg-navy-50" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((__, ci) => (
                      <div key={ci} className="h-[68px] animate-pulse rounded-2xl bg-navy-50" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : totalVisible === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-navy-100 bg-white px-6 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-navy-50">
                <SearchX size={26} className="text-navy-300" />
              </div>
              <p className="mb-1.5 font-display text-lg font-extrabold text-navy-700">No categories match &ldquo;{query}&rdquo;</p>
              <p className="mb-6 max-w-sm text-sm text-navy-400">
                Try a different word, or clear the search to see every category.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full bg-accent-500 px-6 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-accent-600"
              >
                Clear search
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={q} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {liveGroups.map(({ group, items }, i) => (
                  <GroupPanel key={group.key} group={group} items={items} index={i} forceOpen={!!q} />
                ))}
                <SoonPanel items={soonItems} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </section>
    </>
  );
}