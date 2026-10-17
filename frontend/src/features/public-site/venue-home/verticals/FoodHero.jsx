import React, { useEffect, useState } from "react";
import { ChevronDown, Phone } from "lucide-react";
import { onAccent } from "../../../../lib/verticals";

const fade = (loaded, delay = 0) => ({
  opacity: loaded ? 1 : 0,
  transform: loaded ? "translateY(0)" : "translateY(24px)",
  transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`
});

export default function FoodHero({ venue, stats = [] }) {
  const theme = venue.theme_color;
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 60); return () => clearTimeout(t); }, []);
  const shown = stats.filter((s) => s.title || s.subtitle).slice(0, 4);
  const phone = String(venue.phone || "").replace(/\D/g, "");

  return (
    <section id="home" className="relative min-h-[88svh] flex items-center bg-stone-950 text-white overflow-hidden">
      {venue.hero_image_url ? (
        <img src={venue.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 75% 25%, ${theme}88, transparent 55%), linear-gradient(135deg, #1c1917, #0c0a09)` }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-stone-950/30" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-6 pt-28 pb-24 text-center">
        <div style={fade(loaded)}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur text-xs font-bold uppercase tracking-[0.25em]">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme }} /> Order direct · no app fees
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl md:text-7xl font-black leading-[1.02] tracking-tight" style={{ textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>
            {venue.hero_heading || venue.hall_name}
          </h1>
        </div>
        {venue.hero_subheading && <p className="mt-5 max-w-2xl mx-auto text-lg md:text-xl text-stone-100" style={fade(loaded, 0.15)}>{venue.hero_subheading}</p>}
        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center" style={fade(loaded, 0.3)}>
          <a href="#section-menu" className="px-9 py-4 rounded-full font-extrabold shadow-2xl hover:scale-105 active:scale-95 transition-transform" style={{ backgroundColor: theme, color: onAccent(theme) }}>
            Order Online
          </a>
          {phone && (
            <a href={`tel:+${phone.length === 10 ? `91${phone}` : phone}`} className="px-9 py-4 rounded-full font-bold border-2 border-white/70 hover:bg-white/10 inline-flex items-center justify-center gap-2">
              <Phone size={16} /> Call us
            </a>
          )}
        </div>
        {shown.length > 0 && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4" style={fade(loaded, 0.45)}>
            {shown.map((s, i) => (
              <div key={i} className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 px-4 py-3">
                <p className="text-2xl font-extrabold" style={{ color: theme }}>{s.subtitle}</p>
                <p className="text-xs uppercase tracking-wider text-stone-200">{s.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <a href="#section-menu" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 animate-bounce"><ChevronDown size={28} /></a>
    </section>
  );
}