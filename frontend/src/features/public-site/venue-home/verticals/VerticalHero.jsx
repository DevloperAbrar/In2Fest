import React, { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { CountUp } from "./ExtraSections.jsx";
import { waLink, onAccent, plural } from "../../../../lib/verticals";

function useLoaded() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 60); return () => clearTimeout(t); }, []);
  return loaded;
}

const fade = (loaded, delay = 0) => ({
  opacity: loaded ? 1 : 0,
  transform: loaded ? "translateY(0)" : "translateY(28px)",
  transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`
});

/* ─────────────── GYM ─────────────── */
function GymHero({ venue, stats, actions }) {
  const theme = venue.theme_color;
  const loaded = useLoaded();
  const heading = venue.hero_heading || venue.hall_name || "";
  const words = heading.split(" ");
  const last = words.pop();
  const shown = stats.filter((s) => s.title || s.subtitle).slice(0, 4);

  return (
    <section id="home" className="relative min-h-[100svh] flex items-center bg-stone-950 text-white overflow-hidden">
      {venue.hero_image_url ? (
        <img src={venue.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 80% 20%, ${theme}66, transparent 55%), linear-gradient(135deg, #0c0a09, #1c1917)` }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/85 to-stone-950/30" />
      {/* diagonal accent stripe */}
      <div
        className="absolute -right-24 top-0 h-full w-40 -skew-x-12 opacity-80 pointer-events-none hidden sm:block"
        style={{ background: `linear-gradient(180deg, ${theme}, transparent)` }}
      />

      <div className={`relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-6 pt-28 ${shown.length ? "pb-48 md:pb-44" : "pb-24"}`}>
        <div style={fade(loaded)}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur text-xs font-bold uppercase tracking-[0.25em] text-white">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme }} /> Now enrolling
          </span>
          <h1
            className="mt-6 max-w-4xl text-4xl sm:text-6xl md:text-8xl font-black uppercase italic leading-[0.95] tracking-tight text-white"
            style={{ textShadow: "0 4px 30px rgba(0,0,0,0.45)" }}
          >
            {words.join(" ")} <span style={{ color: theme }}>{last}</span>
          </h1>
        </div>
        {venue.hero_subheading && (
          <p className="mt-6 max-w-xl text-lg md:text-xl text-stone-100" style={fade(loaded, 0.15)}>{venue.hero_subheading}</p>
        )}
        <div className="mt-10 flex flex-col sm:flex-row gap-4" style={fade(loaded, 0.3)}>
          <button
            type="button"
            onClick={actions?.openTrial}
            className="px-9 py-4 rounded-full font-extrabold uppercase tracking-wider shadow-2xl hover:scale-105 active:scale-95 transition-transform"
            style={{ backgroundColor: theme, color: onAccent(theme), boxShadow: `0 10px 40px ${theme}77` }}
          >
            {venue.hero_button_text || "Start Free Trial"}
          </button>
          <a
            href="#section-packages"
            className="px-9 py-4 rounded-full font-extrabold uppercase tracking-wider text-white border-2 border-white/50 hover:bg-white/10 transition-colors text-center"
          >
            View Plans
          </a>
        </div>
      </div>

      {shown.length > 0 && (
        <div className="absolute bottom-0 inset-x-0 z-10 border-t border-white/10 bg-black/60 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
            {shown.map((s, i) => (
              <div key={s.id || i}>
                <CountUp value={s.subtitle} className="block text-2xl md:text-3xl font-black" style={{ color: theme }} />
                <span className="text-[11px] uppercase tracking-widest text-white/75">{s.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!shown.length && (
        <ChevronDown size={24} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 animate-bounce" />
      )}
    </section>
  );
}

/* ─────────────── SHOP ─────────────── */
function ShopHero({ venue }) {
  const theme = venue.theme_color;
  const loaded = useLoaded();
  const [term, setTerm] = useState("");
  const catalog = venue.catalog_items || [];
  const tops = Array.from(new Set(catalog.map((i) => String(i.category || "").split(">")[0].trim()).filter(Boolean)));
  const collage = catalog.filter((i) => i.image_url).slice(0, 4);
  const wa = waLink(venue, `Hi ${venue.hall_name}, I'd like to know more about your products.`);

  const goShop = () => document.getElementById("section-product_catalog")?.scrollIntoView({ behavior: "smooth" });
  const search = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("shop:search", { detail: term }));
    goShop();
  };
  const pickCategory = (c) => {
    window.dispatchEvent(new CustomEvent("shop:category", { detail: c }));
    goShop();
  };

  return (
    <section id="home" className="relative bg-stone-950 text-white overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ backgroundColor: theme }} />
      <div className="absolute -bottom-32 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: theme }} />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 grid md:grid-cols-2 gap-10 md:gap-12 items-center">
        <div style={fade(loaded)}>
          {catalog.length > 0 && (
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/25 bg-white/10 text-white">
              {plural(catalog.length, "product")}{tops.length > 0 ? ` · ${plural(tops.length, "category", "categories")}` : ""}
            </span>
          )}
          <h1
            className="mt-5 text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-white"
            style={{ letterSpacing: "-0.02em", textShadow: "0 4px 30px rgba(0,0,0,0.35)" }}
          >
            {venue.hero_heading || venue.hall_name}
          </h1>
          {venue.hero_subheading && <p className="mt-4 text-lg text-stone-200 max-w-lg">{venue.hero_subheading}</p>}

          <form onSubmit={search} className="mt-8 flex max-w-lg rounded-full bg-white p-1.5 shadow-2xl">
            <div className="flex items-center pl-4 text-stone-400"><Search size={18} /></div>
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search for products..."
              aria-label="Search products"
              className="flex-1 min-w-0 px-3 py-2 bg-transparent text-stone-900 placeholder-stone-400 text-sm focus:outline-none"
            />
            <button type="submit" className="px-6 py-2 rounded-full text-sm font-bold active:scale-95 transition-transform" style={{ backgroundColor: theme, color: onAccent(theme) }}>
              Search
            </button>
          </form>

          {tops.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {tops.slice(0, 6).map((c) => (
                <button key={c} type="button" onClick={() => pickCategory(c)} className="px-4 py-1.5 rounded-full text-xs font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors">
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={goShop} className="px-8 py-3.5 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-transform" style={{ backgroundColor: theme, color: onAccent(theme) }}>
              {venue.hero_button_text || "Shop Now"}
            </button>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="px-8 py-3.5 rounded-full font-bold text-white border-2 border-white/50 hover:bg-white/10 transition-colors">
                WhatsApp Us
              </a>
            )}
          </div>
        </div>

        <div style={fade(loaded, 0.2)}>
          {venue.hero_image_url ? (
            <div className="aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10">
              <img src={venue.hero_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          ) : collage.length >= 2 ? (
            <div className="grid grid-cols-2 gap-4">
              {collage.map((c, i) => (
                <div key={c.id} className={`aspect-square rounded-3xl overflow-hidden shadow-xl ${i % 2 ? "translate-y-6" : ""}`}>
                  <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-[4/3] rounded-[2rem]" style={{ background: `linear-gradient(135deg, ${theme}, #0c0a09)` }} />
          )}
        </div>
      </div>
    </section>
  );
}

export default function VerticalHero({ venue, vertical, stats = [], actions }) {
  if (vertical.key === "gym") return <GymHero venue={venue} stats={stats} actions={actions} />;
  if (vertical.key === "shop") return <ShopHero venue={venue} />;
  return null;
}