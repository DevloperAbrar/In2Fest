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

export default function ServicesSection({ venue }) {
  const services = (venue.services || []).filter((s) => s.visible !== false);
  if (!services.length) return null;
  const theme = venue.theme_color || "#2563eb";

  return (
    <section
      id="services"
      className="relative py-32 overflow-hidden"
      style={{ backgroundColor: "#0a0a0a", fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-8 md:px-16">
        <Reveal className="mb-20">
          <div className="text-[100px] font-black leading-none select-none mb-2" style={{ color: "rgba(255,255,255,0.04)", letterSpacing: "-0.04em" }}>03</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-0.5 w-8" style={{ backgroundColor: theme }} />
            <span className="text-xs tracking-[0.4em] uppercase font-medium" style={{ color: theme }}>Services</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white" style={{ letterSpacing: "-0.03em" }}>What We Offer</h2>
        </Reveal>

        <div className="space-y-0">
          {services.map((s, idx) => (
            <Reveal key={s.id || idx} delay={idx * 60}>
              <div
                className="group flex items-start gap-8 py-7 border-t border-white/[0.06] cursor-default transition-all duration-300 hover:pl-3"
              >
                <span className="text-xs font-bold tabular-nums mt-1 flex-shrink-0" style={{ color: theme, minWidth: "2rem" }}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="text-lg mr-2 flex-shrink-0">{s.icon || ""}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-base mb-1" style={{ letterSpacing: "-0.01em" }}>{s.name}</h3>
                  {s.description && <p className="text-sm text-white/35 leading-relaxed">{s.description}</p>}
                </div>
              </div>
            </Reveal>
          ))}
          <div className="border-t border-white/[0.06]" />
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');`}</style>
    </section>
  );
}