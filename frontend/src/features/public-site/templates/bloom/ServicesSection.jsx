import React from "react";
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

export default function ServicesSection({ venue }) {
  const services = (venue.services || []).filter((s) => s.visible !== false);
  if (!services.length) return null;
  const theme = venue.theme_color || "#c2410c";

  return (
    <section
      id="services"
      className="relative py-32 overflow-hidden"
      style={{ backgroundColor: "#fff8f4", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-20">
          <span className="inline-block text-xs tracking-[0.35em] uppercase font-semibold py-1.5 px-4 rounded-full mb-4" style={{ color: theme, backgroundColor: `${theme}12` }}>
            What We Offer
          </span>
          <h2 className="font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(2.2rem, 4vw, 3.5rem)", letterSpacing: "-0.025em" }}>
            Our Services
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s, idx) => (
            <Reveal key={s.id || idx} delay={idx * 70}>
              <div className="group relative bg-white p-7 rounded-3xl shadow-sm hover:shadow-xl shadow-stone-200/60 transition-all duration-500 hover:-translate-y-2 overflow-hidden border border-stone-100">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${theme}12` }}
                >
                  {s.icon ? s.icon : (
                    <span className="font-bold text-xl" style={{ color: theme, fontFamily: "'DM Serif Display', serif" }}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-stone-900 mb-3 text-base">{s.name}</h3>
                {s.description && <p className="text-sm text-stone-400 leading-relaxed">{s.description}</p>}
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
    </section>
  );
}