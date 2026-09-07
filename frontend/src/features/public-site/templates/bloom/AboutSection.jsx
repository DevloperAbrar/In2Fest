import React from "react";
import { useScrollReveal } from "../../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-900 ease-out ${className}`}
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(40px)" }}
    >
      {children}
    </div>
  );
}

export default function AboutSection({ venue }) {
  if (!venue.about_text) return null;
  const theme = venue.theme_color || "#c2410c";

  return (
    <section
      id="about"
      className="relative py-32 overflow-hidden"
      style={{ backgroundColor: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}
    >
      <svg className="absolute top-0 right-0 w-96 h-96 opacity-[0.06] pointer-events-none" viewBox="0 0 200 200">
        <path fill={theme} d="M47.1,-62.1C58.9,-52.3,64.8,-35.6,68.3,-18.6C71.9,-1.5,73.2,15.9,67.2,30.2C61.2,44.5,47.9,55.7,33.3,63.2C18.7,70.7,2.7,74.5,-13.1,72C-28.9,69.5,-44.6,60.7,-55.8,47.8C-67,34.9,-73.7,17.9,-72.4,1.8C-71,-14.3,-61.6,-29.6,-50.3,-40.4C-39,-51.3,-25.8,-57.6,-11.1,-62.3C3.6,-67,35.3,-71.9,47.1,-62.1Z" transform="translate(100 100)" />
      </svg>

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-center">
          <div className="lg:col-span-3 space-y-7">
            <Reveal>
              <span className="inline-block text-xs tracking-[0.35em] uppercase font-semibold py-1.5 px-4 rounded-full" style={{ color: theme, backgroundColor: `${theme}12` }}>
                Our Story
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="font-bold text-stone-900 leading-tight" style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(2.2rem, 4vw, 3.8rem)", letterSpacing: "-0.025em" }}>
                About {venue.hall_name}
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-stone-500 leading-[1.9] text-base">{venue.about_text}</p>
            </Reveal>
            {(venue.about_highlights || []).length > 0 && (
              <Reveal delay={300}>
                <div className="flex flex-wrap gap-4 pt-2">
                  {(venue.about_highlights || []).map((h, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-3xl font-bold" style={{ fontFamily: "'DM Serif Display', serif", color: theme }}>{h.value}</span>
                      <span className="text-xs text-stone-400 max-w-[90px] leading-tight">{h.title}</span>
                      {i < (venue.about_highlights.length - 1) && <div className="w-px h-8 bg-stone-200 ml-1" />}
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>

          <div className="lg:col-span-2">
            <Reveal delay={150}>
              <div className="relative">
                {venue.hero_image_url ? (
                  <img
                    src={venue.hero_image_url}
                    alt={venue.hall_name}
                    className="w-full h-[460px] object-cover shadow-2xl shadow-stone-300/40"
                    style={{ borderRadius: "60% 40% 40% 60% / 55% 50% 50% 45%" }}
                  />
                ) : (
                  <div
                    className="w-full h-[460px] flex items-center justify-center text-white text-8xl font-bold shadow-2xl"
                    style={{ borderRadius: "60% 40% 40% 60% / 55% 50% 50% 45%", background: `linear-gradient(135deg, ${theme}, ${theme}99)` }}
                  >
                    {venue.hall_name?.[0]}
                  </div>
                )}
                <div
                  className="absolute -top-4 -right-4 w-full h-full border-2 pointer-events-none"
                  style={{ borderColor: `${theme}30`, borderRadius: "60% 40% 40% 60% / 55% 50% 50% 45%", transform: "scale(1.06)" }}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
    </section>
  );
}