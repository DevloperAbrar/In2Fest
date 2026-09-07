import React from "react";
import { useScrollReveal } from "../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-800 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"} ${className}`}
    >
      {children}
    </div>
  );
}

export default function AboutSection({ venue }) {
  if (!venue.about_text) return null;
  const theme = venue.theme_color || "#7c3aed";

  return (
    <section id="about" className="relative py-28 bg-white dark:bg-stone-950 overflow-hidden">
      {/* Decorative background shape */}
      <div
        className="absolute top-0 right-0 w-1/2 h-full opacity-[0.04] pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${theme}, transparent 70%)` }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Image side */}
          <Reveal className="relative">
            <div className="relative">
              {venue.hero_image_url ? (
                <img
                  src={venue.hero_image_url}
                  alt={venue.hall_name}
                  className="w-full h-[480px] object-cover rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/40"
                />
              ) : (
                <div
                  className="w-full h-[480px] rounded-3xl flex items-center justify-center text-white text-8xl font-extrabold"
                  style={{ background: `linear-gradient(135deg, ${theme}, ${theme}99)` }}
                >
                  {venue.hall_name?.[0]}
                </div>
              )}
              {/* Floating stat card */}
              {(venue.about_highlights || []).length > 0 && (
                <div className="absolute -bottom-6 -right-6 bg-white dark:bg-stone-900 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 p-5 border border-stone-100 dark:border-stone-800 max-w-[180px]">
                  <p className="text-3xl font-extrabold" style={{ color: theme }}>
                    {venue.about_highlights[0]?.value || "★★★★★"}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{venue.about_highlights[0]?.title || "Trusted by clients"}</p>
                </div>
              )}
              {/* Accent square */}
              <div
                className="absolute -top-4 -left-4 w-20 h-20 rounded-2xl opacity-20"
                style={{ backgroundColor: theme }}
              />
            </div>
          </Reveal>

          {/* Text side */}
          <div className="space-y-6">
            <Reveal delay={100}>
              <div className="flex items-center gap-3">
                <div className="h-px w-8" style={{ backgroundColor: theme }} />
                <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: theme }}>
                  Our Story
                </span>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <h2 className="text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>
                About {venue.hall_name}
              </h2>
            </Reveal>

            <Reveal delay={240}>
              <p className="text-stone-500 dark:text-stone-400 leading-relaxed text-base md:text-lg">{venue.about_text}</p>
            </Reveal>

            {(venue.about_highlights || []).length > 1 && (
              <Reveal delay={320}>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {venue.about_highlights.slice(1).map((h, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl border border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700 hover:shadow-md transition-all duration-300 bg-stone-50 dark:bg-stone-900"
                    >
                      <p className="font-bold text-stone-900 dark:text-white text-sm">{h.title}</p>
                      {h.value && <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{h.value}</p>}
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </div>

      {/* Bottom wave into next section */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-16 block">
          <path d="M0,0 C480,80 960,80 1440,0 L1440,80 L0,80 Z" className="fill-stone-50 dark:fill-stone-900" />
        </svg>
      </div>
    </section>
  );
}