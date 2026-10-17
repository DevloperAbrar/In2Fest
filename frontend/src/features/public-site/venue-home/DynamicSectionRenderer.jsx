import React from "react";
import BusinessHoursDisplay from "./BusinessHoursDisplay.jsx";
import { ChevronDown } from "lucide-react";
import { useScrollReveal } from "../../../hooks/useScrollReveal";
import SocialLinks from "./SocialLinksSection.jsx";
import FreeTrialModal from "./FreeTrialModal.jsx";
import { Stats, Offers, VideoTour, Schedule } from "./verticals/ExtraSections.jsx";
import { GymPlans, GymPrograms, GymTransformations, GymTrainers } from "./verticals/GymSections.jsx";
import ShopStorefront from "./verticals/ShopStorefront.jsx";
import FoodStorefront from "./verticals/FoodStorefront.jsx";
import { Reveal, SectionShell } from "./SectionShell.jsx";


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

const formatCatalogPrice = (p) =>
  typeof p === "number" ? `₹${p.toLocaleString("en-IN")}` : p;

// Categories are stored as "Men" or "Men > Shirts"
const splitCatalogCategory = (value) => {
  const [top = "", sub = ""] = String(value || "").split(">").map((p) => p.trim());
  return { top, sub };
};

function ProductCatalog({ config, theme, toneIdx, venue }) {
  const catalog = Array.isArray(venue?.catalog_items) ? venue.catalog_items : [];
  const usingCatalog = catalog.length > 0;
  const items = usingCatalog ? catalog : (config?.items || []);
  const [activeTop, setActiveTop] = React.useState("All");
  const [activeSub, setActiveSub] = React.useState("All");

  if (!items.length) return null;

  const tops = usingCatalog
    ? Array.from(new Set(items.map((i) => splitCatalogCategory(i.category).top).filter(Boolean)))
    : [];
  const subs =
    activeTop === "All"
      ? []
      : Array.from(
          new Set(
            items
              .map((i) => splitCatalogCategory(i.category))
              .filter((c) => c.top === activeTop && c.sub)
              .map((c) => c.sub)
          )
        );

  const visible = items.filter((i) => {
    if (activeTop === "All") return true;
    const c = splitCatalogCategory(i.category);
    if (c.top !== activeTop) return false;
    return activeSub === "All" || c.sub === activeSub;
  });

  const rawPhone = String(venue?.whatsapp_number || venue?.phone || "").replace(/\D/g, "");
  const waNumber = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const enquiryLink = (it) => {
    if (!waNumber) return null;
    const priceText = it.price !== undefined && it.price !== "" ? ` (${formatCatalogPrice(it.price)})` : "";
    const text = `Hi, I'm interested in ${it.title}${priceText}. Is it available?`;
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
  };

  const chipStyle = (active) =>
    active
      ? { backgroundColor: theme, borderColor: theme, color: "#fff" }
      : { borderColor: `${theme}40`, color: theme };

  return (
    <SectionShell title={config?.title || "Our Products"} toneIdx={toneIdx} theme={theme} subtitle="Products">
      {tops.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {["All", ...tops].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setActiveTop(c); setActiveSub("All"); }}
              className="px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors"
              style={chipStyle(activeTop === c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {subs.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {["All", ...subs].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveSub(c)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
              style={chipStyle(activeSub === c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {tops.length > 0 && subs.length === 0 && <div className="mb-4" />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        {visible.map((it, idx) => {
          const link = usingCatalog ? enquiryLink(it) : null;
          const soldOut = usingCatalog && it.in_stock === false;
          return (
            <Reveal key={it.id || idx} delay={idx * 70}>
              <div className={`rounded-3xl border border-stone-100 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-800 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group h-full flex flex-col ${soldOut ? "opacity-70" : ""}`}>
                {it.image_url && (
                  <div className="overflow-hidden h-40 relative">
                    <img src={it.image_url} alt={it.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    {soldOut && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold">Out of stock</span>
                    )}
                    {!soldOut && it.discount_percent > 0 && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">{it.discount_percent}% OFF</span>
                    )}
                    {!soldOut && it.offer_label && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[10px] font-bold">{it.offer_label}</span>
                    )}
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-stone-900 dark:text-white text-sm">{it.title}</h3>
                  {it.brand && <p className="text-[11px] uppercase tracking-wide text-stone-400 mt-0.5">{it.brand}</p>}
                  {it.price !== undefined && it.price !== "" && (
                    <p className="font-extrabold mt-1 text-base" style={{ color: theme }}>
                      {formatCatalogPrice(it.price)}
                      {it.mrp > 0 && <span className="ml-2 text-xs font-normal text-stone-400 line-through">{formatCatalogPrice(it.mrp)}</span>}
                    </p>
                  )}
                  {it.low_stock && !soldOut && <p className="text-[11px] font-semibold text-amber-600 mt-1">Only a few left</p>}
                  {Array.isArray(it.variants) && it.variants.length > 0 && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Available in: {it.variants.join(" · ")}</p>
                  )}
                  {it.description && <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5 leading-relaxed">{it.description}</p>}
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto pt-3 text-xs font-bold hover:underline"
                      style={{ color: theme }}
                    >
                      Ask on WhatsApp →
                    </a>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
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
  const [trialOpen, setTrialOpen] = React.useState(false);
  const first = (config?.items || [])[0];
  const headline = first?.title || config?.title;
  if (!headline) return null;

  const rawPhone = String(venue?.whatsapp_number || venue?.phone || "").replace(/\D/g, "");
  const waNumber = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const isGym = [venue?.business_category, ...(venue?.secondary_categories || [])].includes("gym-fitness");

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
            {isGym && venue?.id && (
              <button
                type="button"
                onClick={() => setTrialOpen(true)}
                className="px-7 py-3 rounded-full bg-white font-bold text-sm shadow-lg hover:-translate-y-0.5 transition-transform"
                style={{ color: theme }}
              >
                Book Free Trial
              </button>
            )}
            {rawPhone && (
              <a
                href={`tel:+${waNumber}`}
                className={`px-7 py-3 rounded-full font-bold text-sm transition-transform ${isGym ? "border-2 border-white hover:bg-white/10" : "bg-white shadow-lg hover:-translate-y-0.5"}`}
                style={isGym ? undefined : { color: theme }}
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
      {trialOpen && <FreeTrialModal venueId={venue.id} theme={theme} onClose={() => setTrialOpen(false)} />}
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
  cta_banner: CtaBanner,
  social_links: SocialLinks,
  stats: Stats,
  offers: Offers,
  video_tour: VideoTour,
  schedule: Schedule
};

// Gym websites get their own look for these section types.
const GYM_RENDERERS = {
  packages: GymPlans,
  courses: GymPrograms,
  results: GymTransformations,
  team: GymTrainers
};

// Food businesses: the "menu" section becomes live online ordering.
// It falls back to the plain menu list when there are no live dishes yet.
const FoodMenuSection = (props) => <FoodStorefront {...props} Fallback={Menu} />;

export default function DynamicSectionRenderer({ type, config, venue, index = 0, vertical, actions }) {
  let Renderer = RENDERERS[type];
  if (vertical?.key === "gym" && GYM_RENDERERS[type]) Renderer = GYM_RENDERERS[type];
  // Shops with real catalog items get the full storefront (search, filters, WhatsApp cart).
  if (vertical?.key === "shop" && type === "product_catalog" && venue?.catalog_items?.length > 0) {
    Renderer = ShopStorefront;
  }
  if (vertical?.key === "food" && type === "menu") Renderer = FoodMenuSection;
  if (!Renderer || !config) return null;
  return (
    // id is the scroll target for the navbar link (see lib/navItems.js)
    <div id={`section-${type}`} className="scroll-mt-20">
      <Renderer
        config={config}
        theme={venue.theme_color || "#7c3aed"}
        toneIdx={index}
        venue={venue}
        actions={actions}
      />
    </div>
  );
}