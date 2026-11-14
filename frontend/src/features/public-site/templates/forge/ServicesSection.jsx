import React from "react";
import ServiceIcon from "../../../../components/common/ServiceIcon.jsx";
import { ForgeStyles, Reveal, INK, FONT_HEAD, FONT_BODY } from "./shared.jsx";

export default function ServicesSection({ venue }) {
  const services = (venue.services || []).filter((s) => s.visible !== false);
  if (!services.length) return null;
  const theme = venue.theme_color || "#facc15";

  return (
    <section id="services" className="relative py-28 md:py-36 overflow-hidden" style={{ background: INK, fontFamily: FONT_BODY }}>
      <ForgeStyles />
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.4em] uppercase font-bold mb-4" style={{ color: theme }}>What We Offer</p>
            <h2 className="uppercase text-white font-black leading-[0.9]" style={{ fontFamily: FONT_HEAD, fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>
              Our <span style={{ color: theme }}>Services</span>
            </h2>
          </div>
          <div className="hidden md:block h-px flex-1 ml-10 mb-4 bg-white/10" />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 border border-white/10">
          {services.map((s, idx) => (
            <Reveal key={s.id || idx} delay={(idx % 3) * 90}>
              <div
                className="group relative h-full p-8 md:p-10 transition-colors duration-500 hover:!bg-[var(--ac)]"
                style={{ background: INK, "--ac": theme }}
              >
                <p
                  className="font-black leading-none mb-8 transition-colors duration-500 group-hover:text-black/25"
                  style={{ fontFamily: FONT_HEAD, fontSize: "4.5rem", color: `${theme}33` }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </p>
                {s.icon && (
                  <div className="mb-4 transition-colors duration-500 group-hover:text-black" style={{ color: theme }}>
                    <ServiceIcon name={s.icon} size={28} />
                  </div>
                )}
                <h3 className="uppercase font-extrabold text-2xl text-white mb-3 transition-colors duration-500 group-hover:text-black" style={{ fontFamily: FONT_HEAD }}>
                  {s.name}
                </h3>
                {s.description && (
                  <p className="text-sm text-white/50 leading-relaxed transition-colors duration-500 group-hover:text-black/70">{s.description}</p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}