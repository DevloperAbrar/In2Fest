import React from "react";
import { useScrollReveal } from "../../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-900 ease-out ${className}`}
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(32px)" }}
    >
      {children}
    </div>
  );
}

export default function AboutSection({ venue }) {
  if (!venue.about_text) return null;
  const theme = venue.theme_color || "#2563eb";

  return (
    <section
      id="about"
      className="relative py-32 bg-white overflow-hidden"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: theme, opacity: 0.15 }} />

      <div className="max-w-6xl mx-auto px-8 md:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-4">
            <Reveal>
              <div>
                <div className="text-[120px] font-black leading-none select-none mb-4" style={{ color: "#f5f5f5", letterSpacing: "-0.04em" }}>02</div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-0.5 w-8" style={{ backgroundColor: theme }} />
                  <span className="text-xs tracking-[0.4em] uppercase font-medium" style={{ color: theme }}>About</span>
                </div>
                <h2 className="text-3xl font-black text-gray-900 leading-tight mb-8" style={{ letterSpacing: "-0.02em" }}>{venue.hall_name}</h2>
                {(venue.about_highlights || []).length > 0 && (
                  <div className="space-y-4">
                    {(venue.about_highlights || []).map((h, i) => (
                      <div key={i} className="flex items-baseline gap-3">
                        <span className="text-2xl font-black" style={{ color: theme }}>{h.value}</span>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">{h.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <Reveal delay={150}>
              {venue.hero_image_url ? (
                <img src={venue.hero_image_url} alt={venue.hall_name} className="w-full h-[380px] object-cover" style={{ borderRadius: "4px" }} />
              ) : (
                <div className="w-full h-[380px] flex items-center justify-center text-white text-7xl font-black" style={{ backgroundColor: theme, borderRadius: "4px" }}>
                  {venue.hall_name?.[0]}
                </div>
              )}
            </Reveal>
            <Reveal delay={250}>
              <p className="text-gray-500 leading-[1.85] text-base font-light">{venue.about_text}</p>
            </Reveal>
          </div>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');`}</style>
    </section>
  );
}