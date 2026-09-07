import React from "react";
import { Star } from "lucide-react";
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

export default function TestimonialsSection({ venue }) {
  const testimonials = venue.testimonials || [];
  if (!testimonials.length) return null;
  const theme = venue.theme_color || "#a855f7";

  return (
    <section
      id="testimonials"
      className="relative py-32 overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgb(5,0,15) 0%, rgb(8,2,20) 100%)", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="absolute top-16 left-8 select-none pointer-events-none" style={{ fontSize: "240px", lineHeight: 1, fontFamily: "'Playfair Display', serif", color: `${theme}08` }}>"</div>

      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="mb-20">
          <p className="text-xs tracking-[0.4em] uppercase font-medium mb-4" style={{ color: theme }}>Testimonials</p>
          <h2 className="text-5xl md:text-6xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>What Clients Say</h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <Reveal key={t.id || idx} delay={idx * 100}>
              <div
                className="relative p-8 rounded-2xl border h-full flex flex-col transition-all duration-500 hover:-translate-y-1"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
              >
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < (t.rating || 5) ? "fill-yellow-400 text-yellow-400" : "text-white/10 fill-white/10"} />
                  ))}
                </div>
                <p className="text-white/55 leading-relaxed text-sm flex-1 italic">&ldquo;{t.description}&rdquo;</p>
                <div className="flex items-center gap-3 mt-7 pt-7 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${theme}88, ${theme}44)` }}>
                    {t.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    {t.location && <p className="text-xs text-white/35 mt-0.5">{t.location}</p>}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Inter:wght@300;400;500&display=swap');`}</style>
    </section>
  );
}