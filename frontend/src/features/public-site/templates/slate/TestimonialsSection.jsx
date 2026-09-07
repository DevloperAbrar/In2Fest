import React from "react";
import { Star } from "lucide-react";
import { useScrollReveal } from "../../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-900 ease-out ${className}`}
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(28px)" }}
    >
      {children}
    </div>
  );
}

export default function TestimonialsSection({ venue }) {
  const testimonials = venue.testimonials || [];
  if (!testimonials.length) return null;
  const theme = venue.theme_color || "#2563eb";

  return (
    <section
      id="testimonials"
      className="relative py-32 overflow-hidden"
      style={{ backgroundColor: "#0a0a0a", fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-8 md:px-16">
        <Reveal className="mb-20">
          <div className="text-[100px] font-black leading-none select-none mb-2" style={{ color: "rgba(255,255,255,0.04)", letterSpacing: "-0.04em" }}>05</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-0.5 w-8" style={{ backgroundColor: theme }} />
            <span className="text-xs tracking-[0.4em] uppercase font-medium" style={{ color: theme }}>Reviews</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white" style={{ letterSpacing: "-0.03em" }}>What Clients Say</h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, idx) => (
            <Reveal key={t.id || idx} delay={idx * 80}>
              <div className="p-7 border border-white/[0.07] h-full flex flex-col hover:border-white/[0.15] transition-all duration-300" style={{ borderRadius: "4px" }}>
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < (t.rating || 5) ? "fill-yellow-400 text-yellow-400" : "fill-white/10 text-white/10"} />
                  ))}
                </div>
                <p className="text-white/45 text-sm leading-relaxed flex-1 font-light">&ldquo;{t.description}&rdquo;</p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/[0.06]">
                  <div className="w-8 h-8 flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: theme, borderRadius: "2px" }}>
                    {t.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    {t.location && <p className="text-xs text-white/30 mt-0.5">{t.location}</p>}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');`}</style>
    </section>
  );
}