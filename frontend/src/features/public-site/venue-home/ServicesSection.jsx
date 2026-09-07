import React from "react";
import { useScrollReveal } from "../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} ${className}`}
    >
      {children}
    </div>
  );
}

export default function ServicesSection({ venue }) {
  const visibleServices = (venue.services || []).filter((s) => s.visible !== false);
  if (visibleServices.length === 0) return null;
  const theme = venue.theme_color || "#7c3aed";

  return (
    <section id="services" className="relative py-28 bg-stone-50 dark:bg-stone-900 overflow-hidden">
      {/* BG accent */}
      <div
        className="absolute bottom-0 left-0 w-96 h-96 opacity-[0.05] rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: theme }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: theme }}>
              What We Offer
            </span>
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white" style={{ letterSpacing: "-0.02em" }}>
            Our Services
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {visibleServices.map((s, idx) => (
            <Reveal key={s.id} delay={idx * 80}>
              <div
                className="group relative bg-white dark:bg-stone-800 rounded-3xl p-7 shadow-sm hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-black/30 transition-all duration-400 border border-stone-100 dark:border-stone-700 hover:-translate-y-2 overflow-hidden"
              >
                {/* Hover fill accent */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300 rounded-3xl"
                  style={{ backgroundColor: theme }}
                />

                <div className="flex items-start gap-4 relative z-10">
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${theme}, ${theme}cc)` }}
                  >
                    {s.icon ? (
                      <span className="text-xl">{s.icon}</span>
                    ) : (
                      <span className="text-sm font-bold">{String(idx + 1).padStart(2, "0")}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-white mb-2 text-base">
                      {s.name}
                    </h3>
                    {s.description && (
                      <p className="text-sm text-stone-400 dark:text-stone-400 leading-relaxed">{s.description}</p>
                    )}
                  </div>
                </div>

                {/* Bottom accent line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                  style={{ backgroundColor: theme }}
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-16 block">
          <path d="M0,40 C360,0 1080,80 1440,40 L1440,80 L0,80 Z" className="fill-white dark:fill-stone-950" />
        </svg>
      </div>
    </section>
  );
}