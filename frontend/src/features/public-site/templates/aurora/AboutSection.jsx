import React from "react";
import { useScrollReveal } from "../../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${className}`}
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(50px)" }}
    >
      {children}
    </div>
  );
}

export default function AboutSection({ venue }) {
  if (!venue.about_text) return null;
  const theme = venue.theme_color || "#a855f7";

  return (
    <section
      id="about"
      className="relative py-32 overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgb(5,0,15) 0%, rgb(8,2,20) 100%)", fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${theme}18, transparent 65%)` }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

          <div className="relative">
            <Reveal>
              <div className="relative">
                {venue.hero_image_url ? (
                  <img
                    src={venue.hero_image_url}
                    alt={venue.hall_name}
                    className="w-full h-[520px] object-cover"
                    style={{ clipPath: "polygon(0 0, 92% 0, 100% 8%, 100% 100%, 8% 100%, 0 92%)" }}
                  />
                ) : (
                  <div
                    className="w-full h-[520px] flex items-center justify-center text-8xl font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${theme}55, ${theme}22)`, clipPath: "polygon(0 0, 92% 0, 100% 8%, 100% 100%, 8% 100%, 0 92%)" }}
                  >
                    {venue.hall_name?.[0]}
                  </div>
                )}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2" style={{ borderColor: theme }} />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2" style={{ borderColor: theme }} />
                {(venue.about_highlights || []).length > 0 && (
                  <div
                    className="absolute -right-8 bottom-16 p-5 rounded-2xl border"
                    style={{ background: "rgba(10,5,25,0.95)", backdropFilter: "blur(20px)", borderColor: `${theme}44` }}
                  >
                    <p className="text-3xl font-bold" style={{ color: theme, fontFamily: "'Playfair Display', serif" }}>
                      {venue.about_highlights[0]?.value || "★ 5.0"}
                    </p>
                    <p className="text-xs text-white/50 mt-1 tracking-wide">{venue.about_highlights[0]?.title || "Rating"}</p>
                  </div>
                )}
              </div>
            </Reveal>
          </div>

          <div className="space-y-8">
            <Reveal delay={100}>
              <p className="text-xs tracking-[0.4em] uppercase font-medium" style={{ color: theme }}>Our Story</p>
            </Reveal>
            <Reveal delay={180}>
              <h2
                className="text-5xl md:text-6xl font-bold text-white leading-tight"
                style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}
              >
                About<br />{venue.hall_name}
              </h2>
            </Reveal>
            <Reveal delay={260}>
              <div className="w-16 h-px" style={{ backgroundColor: theme }} />
            </Reveal>
            <Reveal delay={320}>
              <p className="text-white/55 leading-[1.9] text-base">{venue.about_text}</p>
            </Reveal>
            {(venue.about_highlights || []).length > 1 && (
              <Reveal delay={400}>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  {venue.about_highlights.slice(1).map((h, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-2xl border"
                      style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
                    >
                      <p className="font-bold text-white text-sm">{h.title}</p>
                      {h.value && <p className="text-xs mt-1" style={{ color: theme }}>{h.value}</p>}
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Inter:wght@300;400;500&display=swap');`}</style>
    </section>
  );
}