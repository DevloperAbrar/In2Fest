import React from "react";
import BusinessHoursDisplay from "./BusinessHoursDisplay.jsx";
import { ChevronDown } from "lucide-react";
import { useScrollReveal } from "../../../hooks/useScrollReveal";

/* ─── Reveal helper ─── */
function Reveal({ children, delay = 0, className = "", from = "bottom" }) {
  const [ref, visible] = useScrollReveal();
  const hiddenClass = from === "left" ? "opacity-0 -translate-x-8" : from === "right" ? "opacity-0 translate-x-8" : "opacity-0 translate-y-10";
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-x-0 translate-y-0" : hiddenClass} ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Section shell with alternating bg + waves ─── */
const TONE_BG = ["bg-white dark:bg-stone-950", "bg-stone-50 dark:bg-stone-900"];
const TONE_WAVE = ["fill-white dark:fill-stone-950", "fill-stone-50 dark:fill-stone-900"];

function SectionShell({ title, toneIdx = 0, nextTone, children, theme, subtitle }) {
  const bgClass = TONE_BG[toneIdx % 2];
  const nextIdx = nextTone !== undefined ? nextTone % 2 : (toneIdx + 1) % 2;
  const nextWaveClass = TONE_WAVE[nextIdx];

  return (
    <section className={`relative overflow-hidden ${bgClass}`}>
      {/* Top wave from previous section */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none rotate-180">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-12 block">
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" className={nextWaveClass} />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-24">
        <Reveal className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: theme }}>{subtitle || ""}</span>
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white" style={{ letterSpacing: "-0.02em" }}>{title}</h2>
        </Reveal>
        {children}
      </div>

      {/* Bottom wave to next section */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-12 block">
          <path d="M0,30 C480,0 960,60 1440,30 L1440,60 L0,60 Z" className={nextWaveClass} />
        </svg>
      </div>
    </section>
  );
}

/* ─── Portfolio ─── */
function Portfolio({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Our Work">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((it, idx) => (
          <Reveal key={it.id} delay={idx * 70}>
            <div className="relative rounded-3xl overflow-hidden group aspect-square bg-stone-100 dark:bg-stone-800 shadow-sm hover:shadow-2xl transition-all duration-400">
              {it.image_url && (
                <img
                  src={it.image_url}
                  alt={it.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-70 group-hover:opacity-100 transition-opacity flex items-end p-5">
                <div>
                  {it.tag && (
                    <span
                      className="inline-block text-[10px] font-bold text-white uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2"
                      style={{ backgroundColor: theme }}
                    >
                      {it.tag}
                    </span>
                  )}
                  {it.title && <p className="text-white font-semibold text-sm">{it.title}</p>}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── Packages ─── */
function Packages({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Pricing">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {items.map((it, idx) => {
          const featured = it.tag?.toLowerCase().includes("popular") || it.tag?.toLowerCase().includes("premium");
          return (
            <Reveal key={it.id} delay={idx * 100}>
              <div
                className={`relative rounded-3xl p-8 border transition-all duration-400 hover:-translate-y-2 ${
                  featured
                    ? "bg-white dark:bg-stone-800 shadow-2xl border-transparent md:scale-105"
                    : "bg-white/80 dark:bg-stone-800/60 border-stone-100 dark:border-stone-700 shadow-sm hover:shadow-xl"
                }`}
                style={featured ? { boxShadow: `0 24px 48px -12px ${theme}40` } : undefined}
              >
                {it.tag && (
                  <span
                    className="absolute -top-3.5 left-7 text-[11px] font-bold text-white px-4 py-1.5 rounded-full shadow-lg"
                    style={{ backgroundColor: theme }}
                  >
                    {it.tag}
                  </span>
                )}
                <h3 className="font-bold text-xl text-stone-900 dark:text-white mb-2 mt-2">{it.title}</h3>
                {it.price && (
                  <p className="text-4xl font-extrabold mb-5" style={{ color: theme }}>{it.price}</p>
                )}
                {it.description && (
                  <ul className="space-y-3">
                    {it.description.split("\n").filter(Boolean).map((line, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-stone-500 dark:text-stone-400">
                        <span
                          className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: theme }}
                        />
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}

/* ─── Occasions ─── */
function Occasions({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="We Cover">
      <div className="flex flex-wrap justify-center gap-3">
        {items.map((it, idx) => (
          <Reveal key={it.id} delay={idx * 50}>
            <button
              className="px-6 py-3 rounded-full text-sm font-semibold border-2 transition-all duration-300 hover:text-white hover:shadow-lg hover:-translate-y-0.5"
              style={{ borderColor: theme, color: theme }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme;
                e.currentTarget.style.boxShadow = `0 8px 24px ${theme}55`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {it.title}
            </button>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── FAQ ─── */
function FAQItem({ item, theme }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-stone-100 dark:border-stone-700 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left gap-4 py-5"
      >
        <span className="font-semibold text-stone-900 dark:text-white text-base">{item.title}</span>
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            open ? "" : "bg-stone-100 dark:bg-stone-700"
          }`}
          style={open ? { backgroundColor: theme } : undefined}
        >
          <ChevronDown
            size={16}
            className={`transition-transform duration-300 text-stone-400 dark:text-stone-400 ${open ? "rotate-180 !text-white" : ""}`}
          />
        </div>
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className="text-stone-500 dark:text-stone-400 leading-relaxed">{item.description}</p>
        </div>
      </div>
    </div>
  );
}

function Faq({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="FAQ">
      <div className="max-w-2xl mx-auto bg-white dark:bg-stone-800 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 p-8">
        {items.map((it) => (
          <FAQItem key={it.id} item={it} theme={theme} />
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── Product Catalog ─── */
function ProductCatalog({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Products">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {items.map((it, idx) => (
          <Reveal key={it.id} delay={idx * 70}>
            <div className="rounded-3xl border border-stone-100 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-800 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              {it.image_url && (
                <div className="overflow-hidden h-40">
                  <img src={it.image_url} alt={it.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-bold text-stone-900 dark:text-white text-sm">{it.title}</h3>
                {it.price && <p className="font-extrabold mt-1 text-base" style={{ color: theme }}>{it.price}</p>}
                {it.description && <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5 leading-relaxed">{it.description}</p>}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── Team ─── */
function Team({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Our Team">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {items.map((it, idx) => (
          <Reveal key={it.id} delay={idx * 80} className="text-center">
            <div
              className="w-28 h-28 rounded-full mx-auto mb-4 overflow-hidden border-4 shadow-lg transition-transform duration-300 hover:scale-110"
              style={{ borderColor: `${theme}40` }}
            >
              {it.image_url
                ? <img src={it.image_url} alt={it.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: theme }}>{it.title?.[0]}</div>
              }
            </div>
            <p className="font-bold text-stone-900 dark:text-white text-sm">{it.title}</p>
            {it.subtitle && <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{it.subtitle}</p>}
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── Process ─── */
function Process({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="How It Works">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 relative">
        <div className="hidden md:block absolute top-6 left-12 right-12 h-px bg-stone-200 dark:bg-stone-700" />
        {items.map((it, idx) => (
          <Reveal key={it.id} delay={idx * 100} className="text-center relative">
            <div
              className="w-12 h-12 rounded-full text-white font-extrabold flex items-center justify-center mx-auto mb-5 relative z-10 shadow-xl text-sm"
              style={{ background: `linear-gradient(135deg, ${theme}, ${theme}bb)` }}
            >
              {idx + 1}
            </div>
            <h3 className="font-bold text-stone-900 dark:text-white mb-2">{it.title}</h3>
            {it.description && <p className="text-sm text-stone-400 dark:text-stone-500 leading-relaxed">{it.description}</p>}
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── Courses ─── */
function Courses({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Programs">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((it, idx) => (
          <Reveal key={it.id} delay={idx * 80}>
            <div className="h-full rounded-3xl border border-stone-100 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-800 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
              {it.image_url && (
                <div className="h-44 overflow-hidden">
                  <img src={it.image_url} alt={it.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 flex flex-col flex-1">
                {it.subtitle && (
                  <span
                    className="self-start text-[11px] font-bold text-white px-3 py-1 rounded-full mb-3"
                    style={{ backgroundColor: theme }}
                  >
                    {it.subtitle}
                  </span>
                )}
                <h3 className="font-bold text-lg text-stone-900 dark:text-white">{it.title}</h3>
                {it.description && (
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 leading-relaxed flex-1">{it.description}</p>
                )}
                {it.price && (
                  <p className="text-2xl font-extrabold mt-4" style={{ color: theme }}>{it.price}</p>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── Menu / Price list ─── */
function Menu({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Menu">
      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {items.map((it, idx) => (
          <Reveal key={it.id} delay={idx * 40}>
            <div className="border-b border-dashed border-stone-200 dark:border-stone-700 pb-4">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-bold text-stone-900 dark:text-white">
                  {it.title}
                  {it.tag && (
                    <span
                      className="ml-2 align-middle text-[10px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{ backgroundColor: theme }}
                    >
                      {it.tag}
                    </span>
                  )}
                </h3>
                {it.price && <span className="font-extrabold whitespace-nowrap" style={{ color: theme }}>{it.price}</span>}
              </div>
              {it.description && (
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">{it.description}</p>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── Opening hours ─── */
function Hours({ config, venue, theme, toneIdx }) {
  const bh = venue?.business_hours;
  if (bh && bh.enabled === false) return null;

  const hasStructured = bh && typeof bh === "object" && bh.days;
  const items = config?.items || [];
  if (!hasStructured && !items.length) return null;

  return (
    <SectionShell title={config?.title || "Opening Hours"} toneIdx={toneIdx} theme={theme} subtitle="Timings">
      {hasStructured ? (
        <Reveal>
          <BusinessHoursDisplay hours={bh} theme={theme} />
        </Reveal>
      ) : (
        <Reveal>
          <div className="max-w-md mx-auto bg-white dark:bg-stone-800 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 p-6">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between py-3 border-b border-stone-100 dark:border-stone-700 last:border-0"
              >
                <span className="font-semibold text-stone-900 dark:text-white">{it.title}</span>
                <span className="text-sm font-medium" style={{ color: theme }}>{it.description}</span>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </SectionShell>
  );
}

/* ─── Results & achievements ─── */
function Results({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Achievements">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((it, idx) => (
          <Reveal key={it.id} delay={idx * 70} className="text-center">
            <div
              className="w-28 h-28 rounded-full mx-auto mb-4 overflow-hidden border-4 shadow-lg"
              style={{ borderColor: `${theme}40` }}
            >
              {it.image_url ? (
                <img src={it.image_url} alt={it.title} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: theme }}
                >
                  {it.title?.[0]}
                </div>
              )}
            </div>
            <p className="font-bold text-stone-900 dark:text-white text-sm">{it.title}</p>
            {it.subtitle && (
              <p className="text-xs font-semibold mt-1" style={{ color: theme }}>{it.subtitle}</p>
            )}
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── CTA banner (first entry) ─── */
function CtaBanner({ config, theme, venue }) {
  const first = (config?.items || [])[0];
  const headline = first?.title || config?.title;
  if (!headline) return null;

  const rawPhone = String(venue?.whatsapp_number || venue?.phone || "").replace(/\D/g, "");
  const waNumber = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  return (
    <section className="px-6 py-16 bg-white dark:bg-stone-950">
      <Reveal>
        <div
          className="max-w-4xl mx-auto rounded-3xl p-10 md:p-14 text-center text-white shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${theme}, ${theme}bb)` }}
        >
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ letterSpacing: "-0.02em" }}>{headline}</h2>
          {first?.description && <p className="mt-3 text-white/90 text-lg">{first.description}</p>}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {rawPhone && (
              <a
                href={`tel:+${waNumber}`}
                className="px-7 py-3 rounded-full bg-white font-bold text-sm shadow-lg hover:-translate-y-0.5 transition-transform"
                style={{ color: theme }}
              >
                Call Now
              </a>
            )}
            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3 rounded-full border-2 border-white font-bold text-sm hover:bg-white/10 transition-colors"
              >
                WhatsApp Us
              </a>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ─── Registry ─── */
const RENDERERS = {
  portfolio: Portfolio,
  packages: Packages,
  process: Process,
  faq: Faq,
  product_catalog: ProductCatalog,
  team: Team,
  occasions: Occasions,
  courses: Courses,
  menu: Menu,
  hours: Hours,
  results: Results,
  cta_banner: CtaBanner
};

export default function DynamicSectionRenderer({ type, config, venue, index = 0 }) {
  const Renderer = RENDERERS[type];
  if (!Renderer || !config) return null;
  return (
    // id is the scroll target for the navbar link (see lib/navItems.js)
    <div id={`section-${type}`} className="scroll-mt-20">
      <Renderer
        config={config}
        theme={venue.theme_color || "#7c3aed"}
        toneIdx={index}
        venue={venue}
      />
    </div>
  );
}