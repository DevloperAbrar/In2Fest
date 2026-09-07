import React from "react";
import { Star } from "lucide-react";
import { useScrollReveal } from "../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

export default function TestimonialsSection({ venue }) {
  const testimonials = venue.testimonials || [];
  if (testimonials.length === 0) return null;
  const theme = venue.theme_color || "#7c3aed";

  return (
    <section
      id="testimonials"
      className="relative py-28 overflow-hidden bg-white dark:bg-stone-950"
      style={{ backgroundImage: `linear-gradient(135deg, ${theme}0a 0%, transparent 50%, ${theme}08 100%)` }}
    >
      {/* Large quote mark decoration */}
      <div className="absolute top-12 left-10 text-[200px] font-serif leading-none opacity-[0.04] dark:opacity-[0.06] pointer-events-none select-none text-stone-900 dark:text-white">
        "
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: theme }}>Testimonials</span>
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white" style={{ letterSpacing: "-0.02em" }}>
            What Clients Say
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <Reveal key={t.id} delay={idx * 100}>
              <div className="group bg-white dark:bg-stone-900 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-black/30 transition-all duration-400 border border-stone-100 dark:border-stone-800 hover:-translate-y-2 flex flex-col h-full relative overflow-hidden">
                {/* Accent corner */}
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100%] opacity-10"
                  style={{ backgroundColor: theme }}
                />

                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < (t.rating || 5) ? "fill-yellow-400 text-yellow-400" : "text-stone-200 dark:text-stone-700"}
                    />
                  ))}
                </div>

                <p className="text-stone-600 dark:text-stone-300 leading-relaxed text-sm flex-1 italic">
                  "{t.description}"
                </p>

                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-stone-100 dark:border-stone-800">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: theme }}
                  >
                    {t.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-white">{t.name}</p>
                    {t.location && <p className="text-xs text-stone-400 dark:text-stone-500">{t.location}</p>}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-16 block">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" className="fill-stone-50 dark:fill-stone-900" />
        </svg>
      </div>
    </section>
  );
}