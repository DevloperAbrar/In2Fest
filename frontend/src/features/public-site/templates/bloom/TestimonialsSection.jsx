import React from "react";
import { Star } from "lucide-react";
import { useScrollReveal } from "../../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-900 ease-out ${className}`}
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(36px)" }}
    >
      {children}
    </div>
  );
}

export default function TestimonialsSection({ venue }) {
  const testimonials = venue.testimonials || [];
  if (!testimonials.length) return null;
  const theme = venue.theme_color || "#c2410c";

  return (
    <section
      id="testimonials"
      className="relative py-32 overflow-hidden"
      style={{ backgroundColor: "#fff8f4", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-20">
          <span className="inline-block text-xs tracking-[0.35em] uppercase font-semibold py-1.5 px-4 rounded-full mb-4" style={{ color: theme, backgroundColor: `${theme}12` }}>
            Testimonials
          </span>
          <h2 className="font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(2.2rem, 4vw, 3.5rem)", letterSpacing: "-0.025em" }}>
            What Clients Say
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <Reveal key={t.id || idx} delay={idx * 100}>
              <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-lg shadow-stone-200/60 transition-all duration-400 hover:-translate-y-1 border border-stone-100 h-full flex flex-col">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < (t.rating || 5) ? "fill-amber-400 text-amber-400" : "text-stone-200 fill-stone-200"} />
                  ))}
                </div>
                <p className="text-stone-500 leading-relaxed text-sm flex-1 italic">&ldquo;{t.description}&rdquo;</p>
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-stone-100">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${theme}, ${theme}99)` }}>
                    {t.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">{t.name}</p>
                    {t.location && <p className="text-xs text-stone-400 mt-0.5">{t.location}</p>}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
    </section>
  );
}