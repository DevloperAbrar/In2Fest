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

export default function ServicesSection({ venue }) {
  const services = (venue.services || []).filter((s) => s.visible !== false);
  if (!services.length) return null;
  const theme = venue.theme_color || "#a855f7";

  return (
    <section
      id="services"
      className="relative py-32 overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgb(8,2,20) 0%, rgb(12,4,28) 100%)", fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse at right, ${theme}12, transparent 60%)` }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="mb-20">
          <p className="text-xs tracking-[0.4em] uppercase font-medium mb-4" style={{ color: theme }}>What We Offer</p>
          <h2
            className="text-5xl md:text-6xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}
          >
            Our Services
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, idx) => (
            <Reveal key={s.id || idx} delay={idx * 80}>
              <div
                className="group relative p-7 rounded-2xl border cursor-default transition-all duration-500 hover:-translate-y-1"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = `${theme}55`}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
              >
                <div
                  className="text-6xl font-bold leading-none mb-5 select-none"
                  style={{ color: `${theme}20`, fontFamily: "'Playfair Display', serif" }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </div>
                {s.icon && <div className="text-2xl mb-3">{s.icon}</div>}
                <h3 className="font-bold text-white text-base mb-3">{s.name}</h3>
                {s.description && <p className="text-sm text-white/45 leading-relaxed">{s.description}</p>}
                <div className="absolute bottom-0 left-6 right-6 h-px transition-all duration-500 opacity-0 group-hover:opacity-100" style={{ backgroundColor: theme }} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Inter:wght@300;400;500;600&display=swap');`}</style>
    </section>
  );
}