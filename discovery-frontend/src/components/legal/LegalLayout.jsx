import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronRight, ChevronDown, ShieldCheck, FileText, ArrowRight, ArrowUp, Mail, Clock, ListChecks,
} from "lucide-react";

import { BASE_DOMAIN, BRAND_NAME } from "../../lib/constants";
import { LEGAL } from "../../lib/legalConfig";

// Date shown under the title. Uses the value from legalConfig when it exists.
const UPDATED = LEGAL.lastUpdated || LEGAL.updated || LEGAL.effectiveDate || "9 November 2026";

const KINDS = {
  privacy: {
    Icon: ShieldCheck,
    chips: ["For customers and vendors", "We do not sell your data"],
    other: { to: "/terms", label: "Terms of Service", hint: "The rules for using In2Fest." },
  },
  terms: {
    Icon: FileText,
    chips: ["For customers and vendors", "Free marketplace listing"],
    other: { to: "/privacy", label: "Privacy Policy", hint: "How we handle personal information." },
  },
};

/* Bulleted list used inside sections. Items can be strings or JSX. */
export function List({ items = [] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-[10px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-500" />
          <span className="min-w-0 flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* Decorative arches, same motif as the home, search and categories heroes. */
function Arches({ className = "", flip = false }) {
  const c = flip ? ["#1a2035", "#e8192c", "#f5a623"] : ["#f5a623", "#e8192c", "#1a2035"];
  return (
    <svg className={className} width="260" height="130" viewBox="0 0 220 110" aria-hidden="true">
      <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke={c[0]} strokeWidth="18" strokeLinecap="round" />
      <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke={c[1]} strokeWidth="18" strokeLinecap="round" />
      <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke={c[2]} strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

/* Highlights the table-of-contents entry for the section being read. */
function useActiveSection(ids) {
  const key = ids.join("|");
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [active, setActive];
}

function goTo(id, setActive) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  setActive(id);
}

function TocLinks({ sections, active, onPick }) {
  return (
    <ol className="space-y-0.5">
      {sections.map((s, i) => {
        const isActive = active === s.id;
        return (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                onPick(s.id);
              }}
              aria-current={isActive ? "true" : undefined}
              className={[
                "flex items-start gap-2.5 rounded-xl px-3 py-2 text-[13px] leading-snug transition-colors",
                isActive
                  ? "bg-navy-700 font-extrabold text-white"
                  : "font-semibold text-navy-500 hover:bg-white hover:text-navy-700",
              ].join(" ")}
            >
              <span className={["w-5 flex-shrink-0 text-right tabular-nums", isActive ? "text-gold-500" : "text-navy-300"].join(" ")}>
                {i + 1}
              </span>
              <span className="min-w-0">{s.title}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export default function LegalLayout({ kind = "privacy", title, path, description, intro, sections = [] }) {
  const reduce = useReducedMotion();
  const cfg = KINDS[kind] || KINDS.privacy;
  const Icon = cfg.Icon;

  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const [active, setActive] = useActiveSection(ids);
  const [tocOpen, setTocOpen] = useState(false);

  const words = (title || "").split(" ");
  const lastWord = words.pop();
  const lead = words.join(" ");

  const fade = (delay = 0) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay } };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `https://${BASE_DOMAIN}/` },
      { "@type": "ListItem", position: 2, name: title, item: `https://${BASE_DOMAIN}${path}` },
    ],
  };

  return (
    <>
      <Helmet>
        <title>{`${title} | ${BRAND_NAME}`}</title>
        {description && <meta name="description" content={description} />}
        <link rel="canonical" href={`https://${BASE_DOMAIN}${path}`} />
        <meta property="og:title" content={`${title} | ${BRAND_NAME}`} />
        {description && <meta property="og:description" content={description} />}
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* HERO: cream, same language as the home page */}
      <section className="relative overflow-hidden bg-[#FFF6E8]">
        <Arches className="absolute -left-10 -bottom-6 hidden opacity-90 md:block" />
        <Arches className="absolute -right-10 -bottom-6 hidden opacity-90 md:block" flip />

        <div className="relative z-10 mx-auto max-w-4xl px-4 pb-12 pt-8 text-center md:pb-16 md:pt-10">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-center gap-1.5 text-xs font-bold text-navy-400">
            <Link to="/" className="transition-colors hover:text-navy-700">Home</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="text-navy-700" aria-current="page">{title}</span>
          </nav>

          <motion.div {...fade(0)} className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_18px_30px_-18px_rgba(26,32,53,0.45)]">
            <Icon size={28} strokeWidth={2.2} className="text-accent-500" />
          </motion.div>

          <motion.h1
            {...fade(0.05)}
            className="mb-5 font-display font-extrabold text-navy-700"
            style={{ fontSize: "clamp(2rem,5.5vw,3.4rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}
          >
            {lead && <>{lead} </>}
            <span className="text-accent-500">{lastWord}</span>
          </motion.h1>

          <motion.div {...fade(0.1)} className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-navy-600 shadow-sm">
              <Clock size={13} className="text-gold-600" /> Last updated: {UPDATED}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-navy-600 shadow-sm">
              <ListChecks size={13} className="text-emerald-600" /> {sections.length} sections
            </span>
            {cfg.chips.map((c) => (
              <span key={c} className="rounded-full border border-navy-100 bg-white/70 px-3.5 py-1.5 text-xs font-bold text-navy-500">
                {c}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* BODY */}
      <section className="bg-[#FFFBF3] pb-16">
        <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-10 lg:grid-cols-[270px_minmax(0,1fr)]">
          {/* Mobile: collapsible contents */}
          <div className="rounded-2xl border border-navy-100 bg-white lg:hidden">
            <button
              type="button"
              onClick={() => setTocOpen((v) => !v)}
              aria-expanded={tocOpen}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-extrabold text-navy-700"
            >
              On this page
              <ChevronDown size={16} className={`transition-transform ${tocOpen ? "rotate-180" : ""}`} />
            </button>
            {tocOpen && (
              <div className="border-t border-navy-50 p-2">
                <TocLinks
                  sections={sections}
                  active={active}
                  onPick={(id) => {
                    setTocOpen(false);
                    goTo(id, setActive);
                  }}
                />
              </div>
            )}
          </div>

          {/* Desktop: sticky contents */}
          <aside className="hidden lg:sticky lg:top-[92px] lg:block" aria-label="Table of contents">
            <p className="mb-3 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-600">On this page</p>
            <div className="max-h-[calc(100vh-130px)] overflow-y-auto pr-1 no-scrollbar">
              <TocLinks sections={sections} active={active} onPick={(id) => goTo(id, setActive)} />
            </div>
          </aside>

          <div className="min-w-0">
            <article className="rounded-[2rem] border border-navy-100 bg-white p-6 shadow-[0_24px_50px_-34px_rgba(26,32,53,0.45)] sm:p-10">
              {intro && (
                <div className="border-b border-navy-50 pb-8 text-base leading-relaxed text-navy-500 md:text-lg [&_p]:m-0">
                  {intro}
                </div>
              )}

              {sections.map((s, i) => (
                <section
                  key={s.id}
                  id={s.id}
                  className={`scroll-mt-28 ${i === 0 ? "pt-8" : "mt-8 border-t border-navy-50 pt-8"}`}
                >
                  <div className="flex items-start gap-3.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-navy-700 font-display text-sm font-extrabold text-gold-500"
                    >
                      {i + 1}
                    </span>
                    <h2
                      className="font-display text-xl font-extrabold leading-snug text-navy-700 md:text-2xl"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      {s.title}
                    </h2>
                  </div>
                  <div className="mt-3 text-[15px] leading-[1.8] text-navy-500 sm:pl-[3.125rem] [&_p]:mt-4 [&_a]:font-semibold">
                    {s.body}
                  </div>
                </section>
              ))}
            </article>

            {/* Contact + cross-link */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] bg-navy-700 p-6 text-white">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <Mail size={18} className="text-gold-500" />
                </span>
                <p className="font-display text-lg font-extrabold">Questions or a complaint?</p>
                <p className="mt-1 text-sm text-white/70">Write to our grievance officer. We acknowledge within 48 hours.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {LEGAL.email && (
                    <a
                      href={`mailto:${LEGAL.email}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-accent-600"
                    >
                      Email us <ArrowRight size={13} />
                    </a>
                  )}
                  <Link
                    to="/contact"
                    className="inline-flex items-center rounded-full border-2 border-white/30 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:border-white"
                  >
                    Contact page
                  </Link>
                </div>
              </div>

              <Link
                to={cfg.other.to}
                className="group rounded-[1.75rem] border-2 border-navy-100 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-navy-700"
              >
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-600">Also read</p>
                <p className="mt-2 font-display text-lg font-extrabold text-navy-700">{cfg.other.label}</p>
                <p className="mt-1 text-sm text-navy-400">{cfg.other.hint}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-accent-600">
                  Open <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-navy-100 bg-white px-4 py-2 text-xs font-extrabold text-navy-600 transition-colors hover:border-navy-700 hover:bg-navy-700 hover:text-white"
              >
                <ArrowUp size={13} /> Back to top
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}