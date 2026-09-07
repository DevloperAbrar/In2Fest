import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export default function HeroSection({ venue }) {
  const [loaded, setLoaded] = useState(false);
  const theme = venue.theme_color || "#c2410c";

  useEffect(() => { const t = setTimeout(() => setLoaded(true), 60); return () => clearTimeout(t); }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen flex overflow-hidden"
      style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", backgroundColor: "#faf7f2" }}
    >
      <div className="relative z-10 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-24 w-full lg:w-1/2 min-h-screen">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-[0.04]" style={{ backgroundColor: theme }} />
        </div>

        <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateX(-30px)", transition: "all 1s cubic-bezier(0.16,1,0.3,1)" }}>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-10 border"
            style={{ fontFamily: "'DM Sans', sans-serif", color: theme, borderColor: `${theme}44`, backgroundColor: `${theme}0d` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme }} />
            {venue.business_category || "Venue"}
          </div>

          <h1
            className="font-bold leading-[1.05] mb-6 text-stone-900"
            style={{ fontSize: "clamp(2.8rem, 6vw, 5.5rem)", letterSpacing: "-0.025em" }}
          >
            {venue.hero_heading || venue.hall_name}
          </h1>

          {venue.hero_subheading && (
            <p
              className="text-stone-500 text-lg leading-relaxed mb-10 max-w-sm"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, opacity: loaded ? 1 : 0, transition: "opacity 1.1s ease 0.2s" }}
            >
              {venue.hero_subheading}
            </p>
          )}

          <div className="flex flex-wrap gap-3" style={{ opacity: loaded ? 1 : 0, transition: "opacity 1.1s ease 0.35s" }}>
            
            <a  href="#inquiry"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-white text-sm transition-all duration-300 hover:shadow-2xl hover:scale-[1.03]"
              style={{ fontFamily: "'DM Sans', sans-serif", backgroundColor: theme, boxShadow: `0 8px 32px ${theme}40` }}
            >
              {venue.hero_button_text || "Book Your Event"}
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            
            <a  href="#gallery"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-sm border-2 transition-all duration-300 hover:bg-stone-100"
              style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(0,0,0,0.15)", color: "rgba(0,0,0,0.7)" }}
            >
              View Gallery
            </a>
          </div>
        </div>

        {(venue.about_highlights || []).length > 0 && (
          <div className="absolute bottom-10 left-8 md:left-16 lg:left-24 flex items-center gap-6" style={{ opacity: loaded ? 1 : 0, transition: "opacity 1s ease 0.6s" }}>
            {(venue.about_highlights || []).slice(0, 2).map((h, i) => (
              <div key={i}>
                <p className="font-bold text-2xl text-stone-900" style={{ letterSpacing: "-0.02em" }}>{h.value}</p>
                <p className="text-xs text-stone-400 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>{h.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="hidden lg:block relative w-1/2 min-h-screen"
        style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateX(30px)", transition: "all 1.1s cubic-bezier(0.16,1,0.3,1) 0.1s" }}
      >
        <div className="absolute inset-4 rounded-3xl overflow-hidden shadow-2xl">
          {venue.hero_image_url ? (
            <img src={venue.hero_image_url} alt={venue.hall_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-8xl font-bold" style={{ background: `linear-gradient(135deg, ${theme}, ${theme}88)` }}>
              {venue.hall_name?.[0]}
            </div>
          )}
        </div>
        <div className="absolute bottom-12 -left-6 p-5 rounded-2xl shadow-xl border border-stone-100/50 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${theme}18` }}>🏛️</div>
            <div>
              <p className="font-bold text-stone-900 text-sm">{venue.hall_name}</p>
              <p className="text-xs text-stone-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>{venue.city || "Premium Venue"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 lg:hidden opacity-10" style={{ backgroundImage: `url(${venue.hero_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
    </section>
  );
}